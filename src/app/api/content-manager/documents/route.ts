import { NextRequest, NextResponse } from "next/server";
import { findDocuments, createDocument, getContentTypeByPlural } from "@/lib/document-service";
import { parseContentQuery } from "@/lib/parse-query";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pluralId = req.nextUrl.searchParams.get("contentType");
  if (!pluralId) return NextResponse.json({ error: "contentType required" }, { status: 400 });
  const contentType = await getContentTypeByPlural(pluralId);
  if (!contentType) return NextResponse.json({ error: "Content type not found" }, { status: 404 });
  const query = parseContentQuery(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const result = await findDocuments(pluralId, {
    ...query,
    publicationState: "preview",
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { contentType: string; data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { contentType: pluralId, data } = body;
  if (!pluralId) return NextResponse.json({ error: "contentType required" }, { status: 400 });
  const result = await createDocument(pluralId, data ?? {});
  if (!result) return NextResponse.json({ error: "Create failed" }, { status: 400 });
  return NextResponse.json(result);
}
