"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Columns2,
} from "lucide-react";
import { useGetContentTypesQuery, useGetDocumentsQuery, useDeleteDocumentMutation } from "@/store/api/cmsApi";
import {
  buildFiltersFromRows,
  getOperatorsForFieldType,
  getFieldType,
  type FilterOpOption,
} from "@/lib/filter-config";

const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const COLUMNS_STORAGE_KEY = "content-manager-visible-columns";

type Attr = { name: string; type: string; enum?: string[] };

export default function ContentManagerListPage() {
  const params = useParams();
  const pluralId = params.pluralId as string;

  // ────────────────────────────────────────────────────────────────
  //  ALL hooks must be declared unconditionally at the top
  // ────────────────────────────────────────────────────────────────

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchInput, setSearchInput] = useState("");
  const [searchSent, setSearchSent] = useState("");
  const [searchField, setSearchField] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterRows, setFilterRows] = useState<
    { id: string; field: string; operator: string; value: string }[]
  >([]);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const columnPanelRef = useRef<HTMLDivElement>(null);

  const { data: contentTypes, isLoading: isLoadingTypes } = useGetContentTypesQuery();

  const contentType = contentTypes?.find((t) => t.pluralId === pluralId);
  const attributes: Attr[] = (contentType?.attributes as Attr[]) ?? [];

  const titleField =
    contentType?.attributes?.find(
      (a: { name: string; type: string }) =>
        a.type === "text" || a.name === "title" || a.name === "name"
    )?.name ?? "documentId";

  const availableColumnIds = useMemo(() => {
    const system = ["documentId", "createdAt", "updatedAt"] as const;
    const attrNames = attributes.map((a) => a.name);
    const withTitle = [titleField, ...attrNames.filter((n) => n !== titleField)];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of withTitle) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    for (const id of system) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }, [titleField, attributes]);

  useEffect(() => {
    if (!pluralId || availableColumnIds.length === 0) return;
    const key = `${COLUMNS_STORAGE_KEY}-${pluralId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const valid = (parsed as string[]).filter((id) =>
            availableColumnIds.includes(id)
          );
          if (valid.length > 0) {
            setVisibleColumns(valid);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    setVisibleColumns([titleField, "documentId", "createdAt"]);
  }, [pluralId, availableColumnIds.join(","), titleField]);

  useEffect(() => {
    if (!pluralId || visibleColumns.length === 0) return;
    const key = `${COLUMNS_STORAGE_KEY}-${pluralId}`;
    try {
      localStorage.setItem(key, JSON.stringify(visibleColumns));
    } catch {
      // ignore
    }
  }, [pluralId, visibleColumns]);

  const setColumnVisible = useCallback((columnId: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      if (visible) return prev.includes(columnId) ? prev : [...prev, columnId];
      return prev.filter((c) => c !== columnId);
    });
  }, []);

  useEffect(() => {
    if (!showColumnPanel) return;
    const handleClick = (e: MouseEvent) => {
      if (columnPanelRef.current && !columnPanelRef.current.contains(e.target as Node)) {
        setShowColumnPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColumnPanel]);

  const filterFieldOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: "documentId", label: "documentId" },
      { value: "createdAt", label: "createdAt" },
      { value: "updatedAt", label: "updatedAt" },
    ];
    for (const a of attributes) {
      list.push({ value: a.name, label: a.name });
    }
    return list;
  }, [attributes]);

  const searchFieldOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "All fields" }];
    const textTypes = new Set(["text", "richtext", "richtext-markdown", "email", "uid"]);
    for (const a of attributes) {
      if (textTypes.has(a.type)) list.push({ value: a.name, label: a.name });
    }
    list.push({ value: "documentId", label: "documentId" });
    return list;
  }, [attributes]);

  const sortableFields = useMemo(
    () => [titleField, "documentId", "createdAt", "updatedAt"],
    [titleField]
  );

  const columnsToShow =
    visibleColumns.length > 0
      ? visibleColumns
      : [titleField, "documentId", "createdAt"];

  const sortParam = sortField != null ? `${sortField}:${sortOrder}` : undefined;
  const apiFilters = useMemo(() => buildFiltersFromRows(filterRows), [filterRows]);

  const { data: documentsData, isLoading: isLoadingDocs } = useGetDocumentsQuery({
    contentType: pluralId,
    page,
    pageSize,
    sort: sortParam,
    search: searchSent || undefined,
    searchField: searchField || undefined,
    filters: apiFilters,
  });

  const [deleteDocument] = useDeleteDocumentMutation();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchSent(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchSent(searchInput.trim());
      setPage(1);
    },
    [searchInput]
  );

  const toggleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("asc");
      }
      return field;
    });
    setPage(1);
  }, []);

  const addFilterRow = useCallback(() => {
    setFilterRows((r) => [
      ...r,
      { id: crypto.randomUUID(), field: "", operator: "containsi", value: "" },
    ]);
    setShowFilters(true);
    setPage(1);
  }, []);

  const updateFilterRow = useCallback(
    (id: string, upd: Partial<{ field: string; operator: string; value: string }>) => {
      setFilterRows((r) =>
        r.map((row) => (row.id === id ? { ...row, ...upd } : row))
      );
      setPage(1);
    },
    []
  );

  const removeFilterRow = useCallback((id: string) => {
    setFilterRows((r) => r.filter((row) => row.id !== id));
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterRows([]);
    setPage(1);
  }, []);

  // ────────────────────────────────────────────────────────────────
  //  Now safe to do early returns
  // ────────────────────────────────────────────────────────────────

  if (isLoadingTypes) {
    return <div className="py-12 text-center text-zinc-500">Loading content types…</div>;
  }

  if (!contentType) {
    return (
      <div className="py-12">
        <p className="text-zinc-500">Content type not found.</p>
        <Link
          href="/admin/content-manager"
          className="mt-4 inline-block text-indigo-400 hover:underline"
        >
          ← Back to Content Manager
        </Link>
      </div>
    );
  }

  const documents = (documentsData?.data ?? []) as Record<string, unknown>[];
  const meta = documentsData?.meta?.pagination;
  const total = meta?.total ?? 0;
  const pageCount = meta?.pageCount ?? 1;

  const hasActiveFilters = filterRows.length > 0;

  async function handleDelete(documentId: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteDocument({ contentType: pluralId, documentId }).unwrap();
    } catch {
      // ignore or show toast/notification in real app
    }
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function SortableTh({ label, field }: { label: string; field: string }) {
    const active = sortField === field;
    const dir = active ? sortOrder : null;
    return (
      <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 hover:text-white"
        >
          {label}
          {dir === "asc" && <ChevronUp className="w-3.5 h-3.5" />}
          {dir === "desc" && <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </th>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/content-manager" className="text-sm text-zinc-500 hover:text-white">
            ← Content Manager
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{contentType.name}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{total} entry / entries</p>
        </div>
        <Link
          href={`/admin/content-manager/${pluralId}/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4" />
          Create new entry
        </Link>
      </div>

      {/* Search + field selector + per page + filters toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Search in field"
          >
            {searchFieldOptions.map((o) => (
              <option key={o.value || "_all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600"
          >
            Search
          </button>
        </form>

        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="relative" ref={columnPanelRef}>
          <button
            type="button"
            onClick={() => setShowColumnPanel((s) => !s)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-sm font-medium"
          >
            <Columns2 className="w-4 h-4" />
            Columns
          </button>
          {showColumnPanel && (
            <div className="absolute left-0 top-full mt-1 z-20 min-w-[220px] py-2 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase border-b border-zinc-800">
                Show / hide columns
              </div>
              <div className="max-h-64 overflow-y-auto px-1 py-1">
                {availableColumnIds.map((colId) => (
                  <label
                    key={colId}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={columnsToShow.includes(colId)}
                      onChange={(e) => setColumnVisible(colId, e.target.checked)}
                      className="rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-zinc-300">{colId}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
            hasActiveFilters
              ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters {hasActiveFilters ? `(${filterRows.length})` : ""}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-zinc-500 hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {filterRows.map((row) => {
            const fieldLabel =
              filterFieldOptions.find((o) => o.value === row.field)?.label ?? row.field;
            const opLabel =
              getOperatorsForFieldType(getFieldType(row.field, attributes)).find(
                (o) => o.value === row.operator
              )?.label ?? row.operator;
            const valueLabel = row.value ? ` "${row.value}"` : "";
            return (
              <span
                key={row.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
              >
                <span className="font-medium">{fieldLabel}</span>
                <span className="text-zinc-500">{opLabel}</span>
                {valueLabel && <span>{valueLabel}</span>}
                <button
                  type="button"
                  onClick={() => removeFilterRow(row.id)}
                  className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-white"
                  aria-label="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-400">Filters</span>
            <button
              type="button"
              onClick={addFilterRow}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              + Add filter
            </button>
          </div>
          <div className="space-y-3">
            {filterRows.length === 0 && (
              <p className="text-sm text-zinc-500">
                No filters. Add a filter to narrow results.
              </p>
            )}
            {filterRows.map((row) => (
              <FilterRow
                key={row.id}
                row={row}
                attributes={attributes}
                filterFieldOptions={filterFieldOptions}
                onUpdate={(upd) => updateFilterRow(row.id, upd)}
                onRemove={() => removeFilterRow(row.id)}
              />
            ))}
          </div>
        </div>
      )}

      {isLoadingDocs ? (
        <div className="py-12 text-center text-zinc-500">Loading entries…</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {columnsToShow.map((colId) =>
                  sortableFields.includes(colId) ? (
                    <SortableTh
                      key={colId}
                      label={colId}
                      field={colId}
                    />
                  ) : (
                    <th
                      key={colId}
                      className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                    >
                      {colId}
                    </th>
                  )
                )}
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {documents.map((doc) => {
                const docId = doc.documentId as string;
                const title = (doc[titleField] as string) ?? docId ?? "—";
                return (
                  <tr key={docId} className="hover:bg-zinc-800/30">
                    {columnsToShow.map((colId) => {
                      const val = doc[colId];
                      const isTitle = colId === titleField;
                      const cellContent =
                        colId === "documentId"
                          ? docId
                          : colId === "createdAt" || colId === "updatedAt"
                            ? val
                              ? new Date(val as string).toLocaleString()
                              : "—"
                            : val != null && val !== ""
                              ? String(val)
                              : "—";
                      return (
                        <td key={colId} className="px-6 py-3 text-sm text-zinc-400">
                          {isTitle ? (
                            <Link
                              href={`/admin/content-manager/${pluralId}/${docId}`}
                              className="font-medium text-white hover:underline"
                            >
                              {String(cellContent)}
                            </Link>
                          ) : (
                            colId === "documentId" ? (
                              <span className="font-mono text-zinc-500">{cellContent}</span>
                            ) : (
                              cellContent
                            )
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/content-manager/${pluralId}/${docId}`}
                        className="inline-flex items-center gap-1 text-indigo-400 hover:underline text-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(docId, e)}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-sm ml-3"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {documents.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              {searchSent || hasActiveFilters
                ? "No entries match your search or filters."
                : "No entries yet. Create your first entry."}
            </div>
          )}

          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t border-zinc-800 bg-zinc-900/30">
              <p className="text-sm text-zinc-500">
                Showing {start}–{end} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  row,
  attributes,
  filterFieldOptions,
  onUpdate,
  onRemove,
}: {
  row: { id: string; field: string; operator: string; value: string };
  attributes: Attr[];
  filterFieldOptions: { value: string; label: string }[];
  onUpdate: (upd: Partial<{ field: string; operator: string; value: string }>) => void;
  onRemove: () => void;
}) {
  const fieldType = getFieldType(row.field, attributes);
  const operators: FilterOpOption[] = getOperatorsForFieldType(fieldType);
  const selectedOp = operators.find((o) => o.value === row.operator) ?? operators[0];

  const handleFieldChange = (field: string) => {
    const type = getFieldType(field, attributes);
    const ops = getOperatorsForFieldType(type);
    onUpdate({ field, operator: ops[0]?.value ?? "containsi", value: "" });
  };

let inputPlaceholder = selectedOp.valueLabel ?? "Value";

if (fieldType.includes("date") || fieldType === "createdAt" || fieldType === "updatedAt") {
  inputPlaceholder = selectedOp.value === "between" || selectedOp.value === "notEmpty"
    ? "e.g. 2025-01-01, 2025-12-31"
    : "YYYY-MM-DD";
}

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={row.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
      >
        <option value="">Select field</option>
        {filterFieldOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={row.operator}
        onChange={(e) => onUpdate({ operator: e.target.value })}
        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
      >
        {operators.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {selectedOp.needsValue && (
        <>
          {fieldType === "boolean" && (row.operator === "eq" || row.operator === "ne") ? (
            <select
              value={row.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px]"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={
                fieldType === "number" ||
                fieldType.includes("integer") ||
                fieldType.includes("float") ||
                fieldType.includes("decimal")
                  ? "number"
                  : fieldType.includes("date") ||
                      fieldType === "createdAt" ||
                      fieldType === "updatedAt"
                    ? "date"
                    : "text"
              }
              value={row.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder={inputPlaceholder}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
             
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        aria-label="Remove filter"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}