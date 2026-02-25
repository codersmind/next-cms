import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const components = await prisma.component.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json(
    components.map((c) => ({
      ...c,
      attributes: JSON.parse(c.attributes),
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name: string; category: string; icon?: string; attributes: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const comp = await prisma.component.create({
    data: {
      name: body.name,
      category: body.category || "default",
      icon: body.icon ?? null,
      attributes: JSON.stringify(body.attributes ?? []),
    },
  });
  return NextResponse.json({
    ...comp,
    attributes: JSON.parse(comp.attributes),
  });
}
