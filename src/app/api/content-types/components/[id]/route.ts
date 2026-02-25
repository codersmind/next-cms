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
  const comp = await prisma.component.findUnique({ where: { id } });
  if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...comp,
    attributes: JSON.parse(comp.attributes),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { name?: string; category?: string; icon?: string; attributes?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const comp = await prisma.component.findUnique({ where: { id } });
  if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = body.name;
  if (body.category != null) data.category = body.category;
  if (body.icon != null) data.icon = body.icon;
  if (body.attributes != null) data.attributes = JSON.stringify(body.attributes);
  const updated = await prisma.component.update({
    where: { id },
    data: data as never,
  });
  return NextResponse.json({
    ...updated,
    attributes: JSON.parse(updated.attributes),
  });
}
