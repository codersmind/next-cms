import { NextRequest, NextResponse } from "next/server";
import {
  findOneDocument,
  updateDocument,
  deleteDocument,
  isReservedApiId,
  getContentTypeByPlural,
  UniqueConstraintError,
} from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";
import { getUserWithRoleFromRequest, canAccess, canPublicAccess } from "@/lib/auth";
import { contentTypeAction } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluralId: string; documentId: string }> }
) {
  const { pluralId, documentId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pluralIdNorm = pluralId.trim().toLowerCase();
  const contentType = await getContentTypeByPlural(pluralIdNorm);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found", data: null }, { status: 404 });
  }
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  const action = contentTypeAction(pluralIdNorm, "findOne");
  const allowed = user ? await canAccess(user, action) : await canPublicAccess(action);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const queryString = req.nextUrl.search ? req.nextUrl.search.slice(1) : "";
  const query = parseContentQuery(queryString);
  const result = await findOneDocument(pluralIdNorm, documentId, {
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
  const pluralIdNorm = pluralId.trim().toLowerCase();
  const contentType = await getContentTypeByPlural(pluralIdNorm);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found" }, { status: 404 });
  }
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  const action = contentTypeAction(pluralIdNorm, "update");
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
    const result = await updateDocument(pluralIdNorm, documentId, data as Record<string, unknown>);
    if (!result) {
      return NextResponse.json({ error: "Document not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UniqueConstraintError) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pluralId: string; documentId: string }> }
) {
  const { pluralId, documentId } = await params;
  if (isReservedApiId(pluralId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pluralIdNorm = pluralId.trim().toLowerCase();
  const contentType = await getContentTypeByPlural(pluralIdNorm);
  if (!contentType) {
    return NextResponse.json({ error: "Content type not found" }, { status: 404 });
  }
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  const action = contentTypeAction(pluralIdNorm, "delete");
  const allowed = user ? await canAccess(user, action) : await canPublicAccess(action);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await deleteDocument(pluralIdNorm, documentId);
  if (!result) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
