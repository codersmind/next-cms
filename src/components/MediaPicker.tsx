"use client";

import { useState, useCallback } from "react";
import { useFormikContext } from "formik";
import { useGetMediaListQuery, useGetMediaByIdQuery, type MediaFile } from "@/store/api/cmsApi";
import { Image, FileText, X, Search } from "lucide-react";

const PAGE_SIZE = 24;

function getIn(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => (acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export function MediaPicker({ name, label = "Image" }: { name: string; label?: string }) {
  const formik = useFormikContext<Record<string, unknown>>();
  const value = (getIn(formik.values, name) as string | null | undefined) ?? null;
  const onChange = useCallback(
    (id: string | null) => {
      formik.setFieldValue(name, id ?? "");
    },
    [formik, name]
  );
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "images">("images");

  const id = value && value.trim() ? value.trim() : null;
  const { data: selectedMedia } = useGetMediaByIdQuery(id ?? "", { skip: !id });
  const { data: listResponse, isLoading } = useGetMediaListQuery(
    { page, pageSize: PAGE_SIZE, search: search.trim() || undefined, filter },
    { skip: !open }
  );
  const list = listResponse?.data ?? [];
  const meta = listResponse?.meta?.pagination;
  const pageCount = meta?.pageCount ?? 1;
  const total = meta?.total ?? 0;

  const handleSelect = useCallback(
    (media: MediaFile) => {
      onChange(media.id);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <div>
      <label className="block mb-1 text-sm text-zinc-400">{label}</label>
      <div className="flex items-center gap-3">
        {id && selectedMedia ? (
          <>
            <div className="w-20 h-20 rounded-lg border border-zinc-700 bg-zinc-800 overflow-hidden flex-shrink-0">
              {selectedMedia.mime.startsWith("image/") ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-zinc-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate" title={selectedMedia.name}>
                {selectedMedia.name}
              </p>
              <p className="text-xs text-zinc-500">{selectedMedia.mime}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Image className="w-5 h-5" />
            Select image
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Select image</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name…"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as "all" | "images");
                  setPage(1);
                }}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="images">Images only</option>
                <option value="all">All files</option>
              </select>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="py-12 text-center text-zinc-500">Loading…</div>
              ) : list.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  {search || filter !== "all" ? "No media match your filters." : "No media yet. Upload in Media Library."}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {list.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => handleSelect(media)}
                      className="rounded-lg border-2 border-zinc-700 bg-zinc-800 overflow-hidden hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-left"
                    >
                      <div className="aspect-square bg-zinc-800">
                        {media.mime.startsWith("image/") ? (
                          <img
                            src={media.url}
                            alt={media.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-zinc-500" />
                          </div>
                        )}
                      </div>
                      <p className="p-1.5 text-xs text-zinc-400 truncate" title={media.name}>
                        {media.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pageCount > 1 && (
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  {total} item{total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-400">
                    Page {page} of {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
