import { NextRequest, NextResponse } from "next/server";
import {
  findOneDocument,
  updateDocument,
  deleteDocument,
  isReservedApiId,
  getContentTypeByPlural,
} from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pluralId: string; documentId: string }> }
) {
  const { pluralId, documentId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found", data: null }, { status: 404 });
  }
  const searchParams = _req.nextUrl.searchParams;
  const query = parseContentQuery(Object.fromEntries(searchParams.entries()));
  const result = await findOneDocument(pluralId, documentId, {
    populate: query.populate,
    fields: query.fields,
  });
  if (!result) {
    return NextResponse.json({ error: "Document not found", data: null }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pluralId: string; documentId: string }> }
) {
  const { pluralId, documentId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: { data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const data = body.data ?? body;
  const result = await updateDocument(pluralId, documentId, data as Record<string, unknown>);
  if (!result) {
    return NextResponse.json({ error: "Document not found or update failed" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pluralId: string; documentId: string }> }
) {
  const { pluralId, documentId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await deleteDocument(pluralId, documentId);
  if (!result) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
