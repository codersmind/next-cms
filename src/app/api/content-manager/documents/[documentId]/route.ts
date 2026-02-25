import { NextRequest, NextResponse } from "next/server";
import { findOneDocument, updateDocument, deleteDocument } from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { contentTypeAction } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pluralId = req.nextUrl.searchParams.get("contentType");
  if (!pluralId) return NextResponse.json({ error: "contentType required" }, { status: 400 });
  const allowed = await canAccess(user, contentTypeAction(pluralId, "findOne"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { documentId } = await params;
  const query = parseContentQuery(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const result = await findOneDocument(pluralId, documentId, {
    populate: query.populate,
    fields: query.fields,
  });
  if (!result) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pluralId = req.nextUrl.searchParams.get("contentType");
  if (!pluralId) return NextResponse.json({ error: "contentType required" }, { status: 400 });
  const allowed = await canAccess(user, contentTypeAction(pluralId, "update"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { documentId } = await params;
  let body: { data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await updateDocument(pluralId, documentId, body.data ?? {});
  if (!result) return NextResponse.json({ error: "Update failed" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pluralId = req.nextUrl.searchParams.get("contentType");
  if (!pluralId) return NextResponse.json({ error: "contentType required" }, { status: 400 });
  const allowed = await canAccess(user, contentTypeAction(pluralId, "delete"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { documentId } = await params;
  const result = await deleteDocument(pluralId, documentId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
