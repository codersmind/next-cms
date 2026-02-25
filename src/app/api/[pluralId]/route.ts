import { NextRequest, NextResponse } from "next/server";
import {
  findDocuments,
  createDocument,
  isReservedApiId,
  getContentTypeByPlural,
  UniqueConstraintError,
} from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pluralId: string }> }
) {
  const { pluralId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found", data: null }, { status: 404 });
  }
  const searchParams = _req.nextUrl.searchParams;
  const query = parseContentQuery(Object.fromEntries(searchParams.entries()));
  const result = await findDocuments(pluralId, {
    filters: query.filters,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
    populate: query.populate as string[],
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
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found" }, { status: 404 });
  }
  let body: { data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const data = body.data ?? body;
  try {
    const result = await createDocument(pluralId, data as Record<string, unknown>);
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
