import { NextRequest, NextResponse } from "next/server";
import {
  findDocuments,
  createDocument,
  isReservedApiId,
  getContentTypeByPlural,
  UniqueConstraintError,
} from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";
import { getUserWithRoleFromRequest, canAccess, canPublicAccess } from "@/lib/auth";
import { contentTypeAction } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluralId: string }> }
) {
  const { pluralId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pluralIdNorm = pluralId.trim().toLowerCase();
  const contentType = await getContentTypeByPlural(pluralIdNorm);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found", data: null }, { status: 404 });
  }
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  const action = contentTypeAction(pluralIdNorm, "find");
  const allowed = user ? await canAccess(user, action) : await canPublicAccess(action);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const queryString = req.nextUrl.search ? req.nextUrl.search.slice(1) : "";
  const query = parseContentQuery(queryString);
  const result = await findDocuments(pluralIdNorm, {
    filters: query.filters,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
    populate: query.populate,
    fields: query.fields,
    publicationState: query.publicationState,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found", data: null }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pluralId: string }> }
) {
  const { pluralId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pluralIdNorm = pluralId.trim().toLowerCase();
  const contentType = await getContentTypeByPlural(pluralIdNorm);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found" }, { status: 404 });
  }
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  const action = contentTypeAction(pluralIdNorm, "create");
  const allowed = user ? await canAccess(user, action) : await canPublicAccess(action);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const data = body.data ?? body;
  try {
    const result = await createDocument(pluralIdNorm, data as Record<string, unknown>);
    if (!result) {
      return NextResponse.json({ error: "Create failed (e.g. single type already exists)" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UniqueConstraintError) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    }
    throw e;
  }
}
