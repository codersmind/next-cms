import qs from "qs";

export type ParseContentQueryResult = {
  filters?: Record<string, unknown>;
  sort?: string[];
  page: number;
  pageSize: number;
  populate?: string | string[] | Record<string, unknown>;
  fields?: string[];
  publicationState: "live" | "preview";
  status?: "draft" | "published" | "scheduled";
  search?: string;
  searchField?: string;
};

/**
 * Parse Strapi-like REST API query params: filters, sort, pagination, populate, fields.
 */
export function parseContentQuery(
  searchParams: string | Record<string, string | string[] | undefined>
): ParseContentQueryResult {
  const params = typeof searchParams === "string" ? qs.parse(searchParams) : searchParams;
  let filters: Record<string, unknown> | undefined;
  if (typeof params.filters === "string") {
    try {
      filters = JSON.parse(params.filters) as Record<string, unknown>;
    } catch {
      filters = undefined;
    }
  } else {
    filters = (params.filters as Record<string, unknown>) || undefined;
  }
  if (filters && Object.keys(filters).length === 0) filters = undefined;
  const sortRaw = params.sort;
  const sort: string[] = [];
  if (typeof sortRaw === "string") {
    if (sortRaw.startsWith("[")) {
      try {
        sort.push(...(JSON.parse(sortRaw) as string[]));
      } catch {
        sort.push(sortRaw);
      }
    } else {
      sort.push(sortRaw);
    }
  } else if (Array.isArray(sortRaw)) sort.push(...(sortRaw as string[]));
  else if (sortRaw && typeof sortRaw === "object")
    sort.push(
      ...Object.values(sortRaw)
        .sort((a, b) => Number(String(a).replace(/\D/g, "")) - Number(String(b).replace(/\D/g, "")))
        .map(String)
    );

  const pagination = params.pagination as Record<string, unknown> | undefined;
  const pageRaw = pagination?.page ?? params.page ?? 1;
  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1);
  const pageSizeRaw = pagination?.pageSize ?? params.pageSize ?? 25;
  const pageSize = Math.min(Math.max(1, Math.floor(Number(pageSizeRaw)) || 25), 100);

  let populate: ParseContentQueryResult["populate"];
  const populateRaw = params.populate;
  if (populateRaw === "*") populate = "*";
  else if (typeof populateRaw === "string" && populateRaw.startsWith("[")) {
    try {
      populate = JSON.parse(populateRaw) as string[];
    } catch {
      populate = [populateRaw];
    }
  } else if (typeof populateRaw === "string") populate = [populateRaw];
  else if (Array.isArray(populateRaw)) populate = populateRaw.map(String) as string[];
  else populate = undefined;

  const fields = params.fields;
  const fieldsList: string[] | undefined =
    typeof fields === "string" ? (fields === "*" ? undefined : fields.split(",")) : undefined;

  const publicationState = (params.publicationState as "live" | "preview") || "live";
  const status = (params.status as "draft" | "published" | "scheduled") || undefined;
  const search = (params._q ?? params.search ?? params.q) as string | undefined;
  const searchTrimmed = typeof search === "string" ? search.trim() || undefined : undefined;
  const searchField = (params.searchField ?? params.searchInField) as string | undefined;
  const searchFieldTrimmed = typeof searchField === "string" ? searchField.trim() || undefined : undefined;

  return {
    filters: filters && Object.keys(filters).length ? filters : undefined,
    sort: sort.length ? sort : undefined,
    page: Number(page),
    pageSize,
    populate,
    fields: fieldsList,
    publicationState,
    status: status && ["draft", "published", "scheduled"].includes(status) ? status : undefined,
    search: searchTrimmed,
    searchField: searchFieldTrimmed,
  };
}
