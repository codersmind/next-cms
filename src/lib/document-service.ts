import { prisma } from "./prisma";
import type { Attribute, RelationAttribute, MediaAttribute } from "@/types/schema";

type DocumentWithContentType = Awaited<ReturnType<typeof prisma.document.findMany>>[number];

/** Thrown when a unique field value already exists on another document */
export class UniqueConstraintError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = "UniqueConstraintError";
  }
}

const RESERVED_API_IDS = ["auth", "upload", "content-types", "content-manager", "users", "roles", "permissions", "media", "admin"];

export function isReservedApiId(pluralId: string): boolean {
  return RESERVED_API_IDS.includes(pluralId.toLowerCase());
}

export async function getContentTypeByPlural(pluralId: string) {
  return prisma.contentType.findUnique({
    where: { pluralId: pluralId.toLowerCase() },
  });
}

export async function getContentTypeBySingular(singularId: string) {
  return prisma.contentType.findUnique({
    where: { singularId: singularId.toLowerCase() },
  });
}

function parseAttributes(attributesJson: string): Attribute[] {
  try {
    return JSON.parse(attributesJson) as Attribute[];
  } catch {
    return [];
  }
}

const IN_MEMORY_CAP = 2000;

function isSortByDbColumn(sort?: string[]): boolean {
  if (!sort?.length) return true;
  const dbColumns = new Set(["createdAt", "updatedAt", "publishedAt", "id", "documentId"]);
  return sort.every((s) => dbColumns.has(s.split(":")[0]));
}

export async function findDocuments(
  pluralId: string,
  options: {
    filters?: Record<string, unknown>;
    sort?: string[];
    page?: number;
    pageSize?: number;
    populate?: string | string[] | Record<string, unknown>;
    fields?: string[];
    publicationState?: "live" | "preview";
    status?: "draft" | "published" | "scheduled";
    search?: string;
    searchField?: string;
  } = {}
) {
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return null;

  const { page = 1, pageSize = 25, publicationState = "live", status, populate, fields, search, searchField } = options;

  const where: Record<string, unknown> = { contentTypeId: contentType.id };
  // Live (public): only documents published on or before now ("that day it's active")
  if (publicationState === "live") {
    where.publishedAt = { not: null, lte: new Date() };
  }
  // Preview (admin) status filter: draft | published | scheduled
  if (publicationState === "preview" && status) {
    if (status === "draft") where.publishedAt = null;
    else if (status === "published") where.publishedAt = { not: null, lte: new Date() };
    else if (status === "scheduled") where.publishedAt = { gt: new Date() };
  }

  const attributes = parseAttributes(contentType.attributes);
  const needsInMemory =
    (options.filters && Object.keys(options.filters).length > 0) ||
    (search != null && search !== "") ||
    !isSortByDbColumn(options.sort);

  if (!needsInMemory) {
    const orderBy = buildOrderBy(options.sort);
    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contentType: true },
      }),
    ]);
    const data = await Promise.all(
      documents.map((doc: DocumentWithContentType) => formatDocument(doc, attributes, contentType, populate, fields))
    );
    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      },
    };
  }

  const orderBy = buildOrderBy(options.sort);
  let documents = await prisma.document.findMany({
    where,
    orderBy,
    take: IN_MEMORY_CAP,
    include: { contentType: true },
  });

  if (options.filters && Object.keys(options.filters).length > 0) {
    documents = applyFilters(documents, options.filters, attributes) as typeof documents;
  }
  if (search != null && search !== "") {
    documents = applySearch(documents, search, attributes, searchField) as typeof documents;
  }
  if (options.sort?.length && !isSortByDbColumn(options.sort)) {
    documents = sortDocuments(documents, options.sort, attributes) as typeof documents;
  }
  const total = documents.length;
  documents = documents.slice((page - 1) * pageSize, page * pageSize);

  const data = await Promise.all(
    documents.map((doc: DocumentWithContentType) => formatDocument(doc, attributes, contentType, populate, fields))
  );

  return {
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    },
  };
}

function applySearch(
  documents: { data: string; documentId: string }[],
  searchTerm: string,
  attributes: Attribute[],
  searchInField?: string
): typeof documents {
  const searchLower = searchTerm.toLowerCase();
  const textLikeTypes = new Set(["text", "richtext", "richtext-markdown", "email", "uid"]);
  let searchableNames: Set<string>;
  if (searchInField) {
    searchableNames = new Set([searchInField]);
    if (searchInField === "documentId") searchableNames.add("documentId");
  } else {
    searchableNames = new Set(
      attributes.filter((a) => textLikeTypes.has(a.type)).map((a) => a.name)
    );
    if (searchableNames.size === 0) searchableNames.add("documentId");
  }
  return documents.filter((doc: { data: string; documentId: string }) => {
    const data = JSON.parse(doc.data) as Record<string, unknown>;
    for (const name of Array.from(searchableNames)) {
      const val = name === "documentId" ? doc.documentId : data[name];
      if (val != null && String(val).toLowerCase().includes(searchLower)) return true;
    }
    return false;
  });
}

function sortDocuments(
  documents: { data: string; documentId: string; createdAt: Date; updatedAt: Date; publishedAt: Date | null }[],
  sort: string[],
  attributes: Attribute[]
): typeof documents {
  const attrNames = new Set(attributes.map((a) => a.name));
  const parsed = sort.map((s) => {
    const [field, dir] = s.split(":");
    return { field: field === "id" ? "createdAt" : field, dir: (dir || "asc") as "asc" | "desc" };
  });
  return [...documents].sort((a, b) => {
    for (const { field, dir } of parsed) {
      let aVal: unknown;
      let bVal: unknown;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else if (field === "updatedAt") {
        aVal = a.updatedAt.getTime();
        bVal = b.updatedAt.getTime();
      } else if (field === "publishedAt") {
        aVal = a.publishedAt?.getTime() ?? 0;
        bVal = b.publishedAt?.getTime() ?? 0;
      } else if (field === "documentId") {
        aVal = a.documentId;
        bVal = b.documentId;
      } else if (attrNames.has(field)) {
        const aData = JSON.parse(a.data) as Record<string, unknown>;
        const bData = JSON.parse(b.data) as Record<string, unknown>;
        aVal = aData[field];
        bVal = bData[field];
      } else {
        continue;
      }
      const aComp = aVal == null ? "" : String(aVal);
      const bComp = bVal == null ? "" : String(bVal);
      const cmp = aComp.localeCompare(bComp, undefined, { numeric: true });
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

const DOC_LEVEL_FIELDS = new Set(["documentId", "createdAt", "updatedAt", "publishedAt"]);

function getFieldValue(
  doc: { data: string; documentId: string; createdAt: Date; updatedAt: Date; publishedAt: Date | null },
  key: string
): unknown {
  if (key === "documentId") return doc.documentId;
  if (key === "createdAt") return doc.createdAt;
  if (key === "updatedAt") return doc.updatedAt;
  if (key === "publishedAt") return doc.publishedAt;
  const data = JSON.parse(doc.data) as Record<string, unknown>;
  return data[key];
}

function applyFilters(
  documents: { data: string; documentId: string; createdAt: Date; updatedAt: Date; publishedAt: Date | null }[],
  filters: Record<string, unknown>,
  attributes: Attribute[]
): typeof documents {
  const attrNames = new Set(attributes.map((a) => a.name));
  const allowedKeys = new Set(Array.from(attrNames).concat(Array.from(DOC_LEVEL_FIELDS)));

  if (Array.isArray(filters.$or)) {
    return documents.filter((doc) => {
      const data = JSON.parse(doc.data) as Record<string, unknown>;
      return (filters.$or as Record<string, unknown>[]).some((orGroup) =>
        matchAllConditions(doc, data, orGroup, allowedKeys, attrNames)
      );
    });
  }

  if (Array.isArray(filters.$and)) {
    return documents.filter((doc) => {
      const data = JSON.parse(doc.data) as Record<string, unknown>;
      return (filters.$and as Record<string, unknown>[]).every((andGroup) =>
        matchAllConditions(doc, data, andGroup, allowedKeys, attrNames)
      );
    });
  }

  return documents.filter((doc) => {
    const data = JSON.parse(doc.data) as Record<string, unknown>;
    return matchAllConditions(doc, data, filters, allowedKeys, attrNames);
  });
}

function matchAllConditions(
  doc: { data: string; documentId: string; createdAt: Date; updatedAt: Date; publishedAt: Date | null },
  data: Record<string, unknown>,
  conditions: Record<string, unknown>,
  allowedKeys: Set<string>,
  attrNames: Set<string>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (key === "$or" || key === "$and") continue;
    if (!allowedKeys.has(key)) continue;
    const fieldVal = DOC_LEVEL_FIELDS.has(key) ? getFieldValue(doc, key) : data[key];
    const op =
      value != null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : { $eq: value };
    if (!matchOperator(fieldVal, op)) return false;
  }
  return true;
}

function parseComparable(val: unknown): number | null {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
    const d = new Date(val).getTime();
    if (!Number.isNaN(d)) return d;
  }
  if (val instanceof Date) return val.getTime();
  return null;
}

function matchOperator(fieldVal: unknown, op: Record<string, unknown>): boolean {
  if ("$eq" in op) return fieldVal === op.$eq;
  if ("$ne" in op) return fieldVal !== op.$ne;
  if ("$lt" in op) {
    const f = parseComparable(fieldVal);
    const o = parseComparable(op.$lt);
    return f != null && o != null && f < o;
  }
  if ("$lte" in op) {
    const f = parseComparable(fieldVal);
    const o = parseComparable(op.$lte);
    return f != null && o != null && f <= o;
  }
  if ("$gt" in op) {
    const f = parseComparable(fieldVal);
    const o = parseComparable(op.$gt);
    return f != null && o != null && f > o;
  }
  if ("$gte" in op) {
    const f = parseComparable(fieldVal);
    const o = parseComparable(op.$gte);
    return f != null && o != null && f >= o;
  }
  if ("$in" in op) return Array.isArray(op.$in) && op.$in.includes(fieldVal);
  if ("$notIn" in op) return Array.isArray(op.$notIn) && !op.$notIn.includes(fieldVal);
  if ("$contains" in op) return typeof fieldVal === "string" && fieldVal.includes(String(op.$contains));
  if ("$containsi" in op)
    return (
      typeof fieldVal === "string" &&
      fieldVal.toLowerCase().includes(String(op.$containsi).toLowerCase())
    );
  if ("$startsWith" in op)
    return typeof fieldVal === "string" && fieldVal.startsWith(String(op.$startsWith));
  if ("$startsWithi" in op)
    return (
      typeof fieldVal === "string" &&
      fieldVal.toLowerCase().startsWith(String(op.$startsWithi).toLowerCase())
    );
  if ("$endsWith" in op)
    return typeof fieldVal === "string" && fieldVal.endsWith(String(op.$endsWith));
  if ("$endsWithi" in op)
    return (
      typeof fieldVal === "string" &&
      fieldVal.toLowerCase().endsWith(String(op.$endsWithi).toLowerCase())
    );
  if ("$null" in op) return (op.$null === true && (fieldVal == null || fieldVal === "")) || (op.$null === false && fieldVal != null && fieldVal !== "");
  if ("$empty" in op)
    return op.$empty === true && (fieldVal == null || fieldVal === "" || (Array.isArray(fieldVal) && fieldVal.length === 0));
  if ("$notEmpty" in op)
    return op.$notEmpty === true && fieldVal != null && fieldVal !== "" && (!Array.isArray(fieldVal) || fieldVal.length > 0);
  if ("$between" in op) {
    const arr = op.$between as unknown[];
    if (!Array.isArray(arr) || arr.length < 2) return false;
    const f = parseComparable(fieldVal);
    const a = parseComparable(arr[0]);
    const b = parseComparable(arr[1]);
    return f != null && a != null && b != null && f >= a && f <= b;
  }
  return true;
}

function buildOrderBy(sort?: string[]): Record<string, string>[] {
  if (!sort?.length) return [{ createdAt: "desc" }];
  return sort.map((s) => {
    const [field, dir] = s.split(":");
    const col = field === "id" ? "createdAt" : field;
    return { [col]: (dir || "asc") as "asc" | "desc" };
  });
}

export async function findOneDocument(
  pluralId: string,
  documentId: string,
  options: { populate?: string | string[] | Record<string, unknown>; fields?: string[] } = {}
) {
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return null;

  const doc = await prisma.document.findFirst({
    where: { documentId, contentTypeId: contentType.id },
    include: { contentType: true },
  });
  if (!doc) return null;

  const attributes = parseAttributes(contentType.attributes);
  const data = await formatDocument(doc, attributes, contentType, options.populate, options.fields);
  return { data, meta: {} };
}

/** Compare two values for uniqueness (normalize strings, allow multiple null/empty) */
function sameUniqueValue(a: unknown, b: unknown): boolean {
  if (a == null || a === "") return false; // don't consider empty as duplicate
  if (b == null || b === "") return false;
  const sa = typeof a === "string" ? a.trim() : a;
  const sb = typeof b === "string" ? b.trim() : b;
  return sa === sb;
}

async function checkUniqueConstraints(
  contentTypeId: string,
  attributes: Attribute[],
  dataToCheck: Record<string, unknown>,
  excludeDocumentId?: string
): Promise<void> {
  const uniqueAttrs = attributes.filter((a) => (a as { unique?: boolean }).unique === true);
  if (uniqueAttrs.length === 0) return;

  const docs = await prisma.document.findMany({
    where: { contentTypeId },
    select: { id: true, data: true },
  });

  for (const attr of uniqueAttrs) {
    const value = dataToCheck[attr.name];
    if (value == null || value === "") continue;
    for (const doc of docs) {
      if (excludeDocumentId && doc.id === excludeDocumentId) continue;
      const docData = JSON.parse(doc.data) as Record<string, unknown>;
      const existing = docData[attr.name];
      if (sameUniqueValue(value, existing)) {
        throw new UniqueConstraintError(
          `Another document already has this value for "${attr.name}".`,
          attr.name
        );
      }
    }
  }
}

export async function createDocument(
  pluralId: string,
  body: Record<string, unknown>,
  options: { locale?: string; publishedAt?: Date | string | null } = {}
) {
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return null;
  if (contentType.kind === "singleType") {
    const existing = await prisma.document.findFirst({ where: { contentTypeId: contentType.id } });
    if (existing) return null; // single type: use update
  }

  const attributes = parseAttributes(contentType.attributes);
  const { data: cleanData, relationFields } = extractRelations(attributes, body);

  await checkUniqueConstraints(contentType.id, attributes, cleanData);

  const documentId = generateDocumentId();

  // Use explicit publishedAt from client, else content-type default (published vs draft)
  const publishedAt =
    options.publishedAt !== undefined
      ? options.publishedAt == null
        ? null
        : options.publishedAt instanceof Date
          ? options.publishedAt
          : new Date(options.publishedAt)
      : (contentType as { defaultPublicationState?: string }).defaultPublicationState === "published"
        ? new Date()
        : null;

  const doc = await prisma.document.create({
    data: {
      documentId,
      contentTypeId: contentType.id,
      data: JSON.stringify(cleanData),
      publishedAt,
      locale: options.locale || "en",
    },
    include: { contentType: true },
  });

  await saveRelations(doc.id, contentType.id, relationFields, attributes);
  const formatted = await formatDocument(doc, attributes, contentType, "*");
  return { data: formatted, meta: {} };
}

export async function updateDocument(
  pluralId: string,
  documentId: string,
  body: Record<string, unknown>,
  options: { publishedAt?: Date | string | null } = {}
) {
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return null;

  const doc = await prisma.document.findFirst({
    where: { documentId, contentTypeId: contentType.id },
  });
  if (!doc) return null;

  const attributes = parseAttributes(contentType.attributes);
  const { data: cleanData, relationFields } = extractRelations(attributes, body);

  const currentData = JSON.parse(doc.data) as Record<string, unknown>;
  const mergedData = { ...currentData, ...cleanData };

  await checkUniqueConstraints(contentType.id, attributes, mergedData, doc.id);

  let publishedAt: Date | null = doc.publishedAt;
  if (options.publishedAt !== undefined) {
    publishedAt = options.publishedAt == null ? null : options.publishedAt instanceof Date ? options.publishedAt : new Date(options.publishedAt);
  }

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      data: JSON.stringify(mergedData),
      publishedAt,
    },
    include: { contentType: true },
  });

  await saveRelations(updated.id, contentType.id, relationFields, attributes);
  const formatted = await formatDocument(updated, attributes, contentType, "*");
  return { data: formatted, meta: {} };
}

export async function deleteDocument(pluralId: string, documentId: string) {
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return null;

  const doc = await prisma.document.findFirst({
    where: { documentId, contentTypeId: contentType.id },
  });
  if (!doc) return null;

  await prisma.documentRelation.deleteMany({
    where: { fromDocumentId: doc.id },
  });
  await prisma.documentRelation.deleteMany({
    where: { toDocumentId: doc.id },
  });
  await prisma.document.delete({ where: { id: doc.id } });
  return { success: true };
}

function generateDocumentId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 25; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function extractRelations(
  attributes: Attribute[],
  body: Record<string, unknown>
): { data: Record<string, unknown>; relationFields: Record<string, unknown> } {
  const data = { ...body };
  const relationFields: Record<string, unknown> = {};
  for (const attr of attributes) {
    if (attr.type === "relation" && attr.name in data) {
      relationFields[attr.name] = data[attr.name];
      delete data[attr.name];
    }
  }
  return { data, relationFields };
}

async function saveRelations(
  fromDocumentId: string,
  contentTypeId: string,
  relationFields: Record<string, unknown>,
  attributes: Attribute[]
) {
  await prisma.documentRelation.deleteMany({ where: { fromDocumentId } });

  for (const attr of attributes) {
    if (attr.type !== "relation") continue;
    const relAttr = attr as RelationAttribute;
    const value = relationFields[relAttr.name];
    if (value === undefined) continue;

    const targets = Array.isArray(value) ? value : value ? [value] : [];
    const documentIds = targets
      .map((t) => (typeof t === "object" && t !== null && "documentId" in t ? (t as { documentId: string }).documentId : typeof t === "string" ? t : null))
      .filter(Boolean) as string[];

    const toDocs = await prisma.document.findMany({
      where: { documentId: { in: documentIds } },
      select: { id: true, documentId: true },
    });
    const toIdByDocId = Object.fromEntries(
      toDocs.map((d: { documentId: string; id: string }) => [d.documentId, d.id])
    );

    for (let i = 0; i < documentIds.length; i++) {
      const toId = toIdByDocId[documentIds[i]];
      if (!toId) continue;
      await prisma.documentRelation.create({
        data: {
          fromDocumentId,
          toDocumentId: toId,
          fieldName: relAttr.name,
          order: i,
        },
      });
    }
  }
}

async function formatDocument(
  doc: { id: string; documentId: string; data: string; publishedAt: Date | null; createdAt: Date; updatedAt: Date; locale: string },
  attributes: Attribute[],
  contentType: { singularId: string; pluralId: string; draftPublish: boolean },
  populate?: string | string[] | Record<string, unknown>,
  fields?: string[]
): Promise<Record<string, unknown>> {
  const data = JSON.parse(doc.data) as Record<string, unknown>;
  const out: Record<string, unknown> = {
    id: doc.id,
    documentId: doc.documentId,
    ...data,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    locale: doc.locale,
  };
  out.publishedAt = doc.publishedAt?.toISOString() ?? null;

  const doPopulate = populate === "*" || (Array.isArray(populate) && populate.length > 0) || (typeof populate === "object" && Object.keys(populate).length > 0);

  if (doPopulate) {
    const relations = await prisma.documentRelation.findMany({
      where: { fromDocumentId: doc.id },
      include: { toDocument: { include: { contentType: true } } },
      orderBy: { order: "asc" },
    });

    const relByField: Record<string, { toDocument: { documentId: string; contentTypeId: string; data: string; contentType: { singularId: string } }; order: number }[]> = {};
    for (const r of relations) {
      if (!relByField[r.fieldName]) relByField[r.fieldName] = [];
      relByField[r.fieldName].push(r as never);
    }

    for (const attr of attributes) {
      if (attr.type === "relation") {
        const relAttr = attr as RelationAttribute;
        const list = relByField[relAttr.name] || [];
        const isMulti = ["oneToMany", "manyToMany", "manyToOne", "manyWay"].includes(relAttr.relation);
        const resolved = await Promise.all(
          list.map((r) => resolveDocument(r.toDocument, fields))
        );
        out[relAttr.name] = isMulti ? resolved : resolved[0] ?? null;
      }
      if (attr.type === "media") {
        const mediaAttr = attr as MediaAttribute;
        const idOrIds = data[attr.name];
        if (idOrIds != null) {
          const ids = mediaAttr.multiple ? (Array.isArray(idOrIds) ? idOrIds : [idOrIds]) : [idOrIds];
          const media = await prisma.media.findMany({ where: { id: { in: ids as string[] } } });
          out[attr.name] = mediaAttr.multiple ? media : media[0] ?? null;
        }
      }
    }
  }

  if (fields?.length) {
    const allowed = new Set(["id", "documentId", "createdAt", "updatedAt", "publishedAt", "locale", ...fields]);
    for (const key of Object.keys(out)) {
      if (!allowed.has(key)) delete out[key];
    }
  }

  return out;
}

async function resolveDocument(
  doc: { documentId: string; data: string; contentType: { singularId: string } },
  _fields?: string[]
): Promise<Record<string, unknown>> {
  const data = JSON.parse(doc.data) as Record<string, unknown>;
  return {
    documentId: doc.documentId,
    ...data,
  };
}
