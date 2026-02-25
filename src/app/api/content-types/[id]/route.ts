import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ct = await prisma.contentType.findUnique({ where: { id } });
  if (!ct) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...ct,
    attributes: JSON.parse(ct.attributes),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: {
    name?: string;
    singularId?: string;
    pluralId?: string;
    kind?: string;
    description?: string;
    draftPublish?: boolean;
    defaultPublicationState?: string;
    i18n?: boolean;
    attributes?: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ct = await prisma.contentType.findUnique({ where: { id } });
  if (!ct) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = body.name;
  if (body.singularId != null) data.singularId = body.singularId;
  if (body.pluralId != null) data.pluralId = body.pluralId;
  if (body.kind != null) data.kind = body.kind;
  if (body.description != null) data.description = body.description;
  if (body.draftPublish != null) data.draftPublish = body.draftPublish;
  if (body.defaultPublicationState != null) data.defaultPublicationState = body.defaultPublicationState;
  if (body.i18n != null) data.i18n = body.i18n;
  if (body.attributes != null) data.attributes = JSON.stringify(body.attributes);
  const updated = await prisma.contentType.update({
    where: { id },
    data: data as never,
  });
  return NextResponse.json({
    ...updated,
    attributes: JSON.parse(updated.attributes),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.contentType.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
