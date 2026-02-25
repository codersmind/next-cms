import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const types = await prisma.contentType.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    types.map((t) => ({
      ...t,
      attributes: JSON.parse(t.attributes),
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name: string;
    singularId?: string;
    pluralId?: string;
    kind: "collectionType" | "singleType";
    description?: string;
    draftPublish?: boolean;
    defaultPublicationState?: string;
    i18n?: boolean;
    attributes: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const singularId = (body.singularId ?? body.name?.toLowerCase().replace(/\s+/g, "-") ?? "content").replace(/\s+/g, "-");
  const pluralId = (body.pluralId ?? singularId + "s").replace(/\s+/g, "-");
  const existing = await prisma.contentType.findFirst({
    where: { OR: [{ singularId }, { pluralId }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Content type with this API ID already exists" }, { status: 400 });
  }
  const defaultPublicationState =
    body.defaultPublicationState === "published" || body.defaultPublicationState === "draft"
      ? body.defaultPublicationState
      : "draft";
  const ct = await prisma.contentType.create({
    data: {
      name: body.name,
      singularId,
      pluralId,
      kind: body.kind ?? "collectionType",
      description: body.description ?? null,
      draftPublish: body.draftPublish ?? false,
      defaultPublicationState,
      i18n: body.i18n ?? false,
      attributes: JSON.stringify(body.attributes ?? []),
    },
  });
  return NextResponse.json({
    ...ct,
    attributes: JSON.parse(ct.attributes),
  });
}
