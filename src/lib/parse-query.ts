import qs from "qs";

/**
 * Parse Strapi-like REST API query params: filters, sort, pagination, populate, fields.
 */
export function parseContentQuery(searchParams: string | Record<string, string | string[] | undefined>) {
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

  const pagination = params.pagination as Record<string, number> | undefined;
  const page = pagination?.page ?? (params.page as number) ?? 1;
  const pageSize = Math.min(
    Number(pagination?.pageSize ?? params.pageSize ?? 25),
    100
  );

  let populate = params.populate;
  if (populate === "*") populate = "*";
  else if (typeof populate === "string" && populate.startsWith("[")) {
    try {
      populate = JSON.parse(populate) as string[];
    } catch {
      populate = [populate];
    }
  } else if (typeof populate === "string") populate = [populate];

  const fields = params.fields;
  const fieldsList = typeof fields === "string" ? (fields === "*" ? undefined : fields.split(",")) : undefined;

  const publicationState = (params.publicationState as "live" | "preview") || "live";
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
    search: searchTrimmed,
    searchField: searchFieldTrimmed,
  };
}
