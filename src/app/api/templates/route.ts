import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.contentTypeTemplate.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    templates.map((t) => ({
      ...t,
      schema: JSON.parse(t.schema),
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name: string; description?: string; schema: { kind: string; attributes: unknown[] } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const template = await prisma.contentTypeTemplate.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      schema: JSON.stringify(body.schema ?? { kind: "collectionType", attributes: [] }),
    },
  });
  return NextResponse.json({
    ...template,
    schema: JSON.parse(template.schema),
  });
}
