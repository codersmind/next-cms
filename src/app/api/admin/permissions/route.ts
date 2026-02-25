import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleId = req.nextUrl.searchParams.get("roleId");
  if (roleId) {
    const permissions = await prisma.permission.findMany({
      where: { roleId },
      orderBy: { action: "asc" },
    });
    return NextResponse.json(permissions);
  }

  const permissions = await prisma.permission.findMany({
    orderBy: [{ roleId: "asc" }, { action: "asc" }],
    include: { role: { select: { id: true, name: true } } },
  });
  return NextResponse.json(permissions);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { roleId: string; action: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { roleId, action, enabled = true } = body;
  if (!roleId?.trim() || !action?.trim())
    return NextResponse.json({ error: "roleId and action required" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const created = await prisma.permission.upsert({
    where: { action_roleId: { action: action.trim(), roleId } },
    create: { roleId, action: action.trim(), enabled },
    update: { enabled },
  });
  return NextResponse.json(created);
}
