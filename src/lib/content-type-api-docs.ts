import type { ContentType, ContentTypeAttribute } from "@/store/api/cmsApi";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL;
  return env ? `${env.replace(/\/$/, "")}/api` : "http://localhost:3000/api";
}

export function exampleValueForAttribute(attr: ContentTypeAttribute): unknown {
  switch (attr.type) {
    case "text":
    case "email":
      return "Example text";
    case "uid":
      return "example-slug";
    case "richtext":
    case "richtext-markdown":
      return "<p>Hello world</p>";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return "2025-01-15T00:00:00.000Z";
    case "json":
      return {};
    case "enumeration": {
      const values = Array.isArray(attr.enum) ? (attr.enum as string[]) : [];
      return values[0] ?? "option-a";
    }
    case "media":
      return null;
    case "relation":
      return null;
    case "component":
      return attr.repeatable ? [] : {};
    case "dynamiczone":
      return [];
    default:
      return null;
  }
}

export function buildExampleDocumentData(
  attributes: ContentTypeAttribute[] | undefined
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const attr of attributes ?? []) {
    if (!attr.name || attr.private) continue;
    data[attr.name] = exampleValueForAttribute(attr);
  }
  return data;
}

export interface ApiEndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  auth: "none" | "jwt";
  query?: string;
  body?: string;
  response?: string;
}

export function buildPublicApiEndpoints(ct: ContentType): ApiEndpointDoc[] {
  const base = getApiBaseUrl();
  const plural = ct.pluralId;
  const exampleData = buildExampleDocumentData(ct.attributes);
  const exampleJson = JSON.stringify({ data: exampleData }, null, 2);
  const flatJson = JSON.stringify(exampleData, null, 2);

  const listQuery =
    "?pagination[page]=1&pagination[pageSize]=25&sort=createdAt:desc&populate=*";

  const endpoints: ApiEndpointDoc[] = [
    {
      method: "GET",
      path: `${base}/${plural}`,
      title: "List entries",
      description:
        ct.kind === "singleType"
          ? "Returns the single entry for this type (published only by default)."
          : "List published documents. Use query params for filters, sort, pagination, and populate.",
      auth: "none",
      query: listQuery,
      response: `{\n  "data": [ { ... } ],\n  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }\n}`,
    },
    {
      method: "POST",
      path: `${base}/${plural}`,
      title: "Create entry",
      description:
        ct.kind === "singleType"
          ? "Create the single-type document (fails if one already exists)."
          : "Create a new document. Body can be `{ \"data\": { ... } }` or flat `{ ... }`.",
      auth: "none",
      body: `${exampleJson}\n\n// or flat:\n${flatJson}`,
      response: `{ "data": { ... }, "meta": {} }`,
    },
    {
      method: "GET",
      path: `${base}/${plural}/{documentId}`,
      title: "Get one entry",
      description: "Fetch a document by documentId. Optional: ?populate=*&fields=title,slug",
      auth: "none",
      response: `{ "data": { ... }, "meta": {} }`,
    },
    {
      method: "PUT",
      path: `${base}/${plural}/{documentId}`,
      title: "Update entry",
      description: "Partial update. Same body shape as create.",
      auth: "none",
      body: exampleJson,
      response: `{ "data": { ... }, "meta": {} }`,
    },
    {
      method: "DELETE",
      path: `${base}/${plural}/{documentId}`,
      title: "Delete entry",
      description: "Removes the document. Response: 204 No Content.",
      auth: "none",
    },
  ];

  return endpoints;
}

export function buildContentManagerEndpoints(ct: ContentType): ApiEndpointDoc[] {
  const base = getApiBaseUrl();
  const plural = ct.pluralId;
  const exampleData = buildExampleDocumentData(ct.attributes);
  const ctParam = `contentType=${plural}`;

  return [
    {
      method: "GET",
      path: `${base}/content-manager/documents`,
      title: "List (admin)",
      description:
        "Includes drafts when permitted. Requires JWT and find permission for this content type.",
      auth: "jwt",
      query: `?${ctParam}&pagination[page]=1&pagination[pageSize]=25&status=draft`,
      response: `{ "data": [ ... ], "meta": { "pagination": { ... } } }`,
    },
    {
      method: "POST",
      path: `${base}/content-manager/documents`,
      title: "Create (admin)",
      description: "Requires create permission. Set publishedAt to null for draft.",
      auth: "jwt",
      body: JSON.stringify(
        {
          contentType: plural,
          data: exampleData,
          publishedAt: ct.draftPublish ? null : new Date().toISOString(),
        },
        null,
        2
      ),
    },
    {
      method: "GET",
      path: `${base}/content-manager/documents/{documentId}`,
      title: "Get one (admin)",
      description: "Requires findOne permission for this content type.",
      auth: "jwt",
      query: `?${ctParam}`,
    },
    {
      method: "PUT",
      path: `${base}/content-manager/documents/{documentId}`,
      title: "Update (admin)",
      description: "Merge fields in data. Set publishedAt to publish or null for draft.",
      auth: "jwt",
      query: `?${ctParam}`,
      body: JSON.stringify({ data: exampleData, publishedAt: null }, null, 2),
    },
    {
      method: "DELETE",
      path: `${base}/content-manager/documents/{documentId}`,
      title: "Delete (admin)",
      description: "Requires delete permission. Returns 204 No Content.",
      auth: "jwt",
      query: `?${ctParam}`,
    },
  ];
}

export const QUERY_PARAM_DOCS = [
  { name: "filters", desc: "Filter object, e.g. filters[title][$containsi]=hello" },
  { name: "sort", desc: "Sort field, e.g. createdAt:desc" },
  { name: "pagination[page]", desc: "Page number (default 1)" },
  { name: "pagination[pageSize]", desc: "Page size (default 25, max 100)" },
  { name: "populate", desc: "Relations/media/components, e.g. populate=* or populate=author" },
  { name: "fields", desc: "Limit top-level fields, e.g. fields=title,slug" },
  { name: "publicationState", desc: "live (default on public API) | preview" },
  { name: "_q / search / q", desc: "Full-text search on text-like fields" },
] as const;

export const AUTH_HEADER_EXAMPLE = `Authorization: Bearer <your-jwt>`;
