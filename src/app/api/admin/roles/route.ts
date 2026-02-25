import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, permissions: true } } },
  });
  return NextResponse.json(
    roles.map(({ _count, ...r }) => ({ ...r, usersCount: _count.users, permissionsCount: _count.permissions }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name: string; description?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, description, type } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 400 });

  const created = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      type: type?.trim() || "custom",
    },
  });
  return NextResponse.json(created);
}
