import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { isProtectedRole } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.roles");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true, permissions: true } } },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...role, usersCount: role._count.users, permissionsCount: role._count.permissions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.roles");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { name?: string; description?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.name != null && body.name.trim() !== existing.name) {
    const taken = await prisma.role.findUnique({ where: { name: body.name.trim() } });
    if (taken) return NextResponse.json({ error: "Role name already exists" }, { status: 400 });
  }

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(body.name != null && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.type !== undefined && { type: body.type?.trim() || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.roles");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isProtectedRole(existing.name)) {
    return NextResponse.json(
      { error: "This role cannot be deleted (system role)." },
      { status: 400 }
    );
  }
  await prisma.role.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
