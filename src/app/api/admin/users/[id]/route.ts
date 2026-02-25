import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, firstname: true, lastname: true, blocked: true, roleId: true, createdAt: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(target);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { email?: string; username?: string; password?: string; firstname?: string; lastname?: string; blocked?: boolean; roleId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { email?: string; username?: string | null; password?: string; firstname?: string | null; lastname?: string | null; blocked?: boolean; roleId?: string | null } = {};
  if (body.email != null) data.email = body.email.trim().toLowerCase();
  if (body.username !== undefined) data.username = body.username?.trim() || null;
  if (body.password != null && body.password !== "") data.password = await hashPassword(body.password);
  if (body.firstname !== undefined) data.firstname = body.firstname?.trim() || null;
  if (body.lastname !== undefined) data.lastname = body.lastname?.trim() || null;
  if (body.blocked !== undefined) data.blocked = body.blocked;
  if (body.roleId !== undefined) data.roleId = body.roleId || null;

  if (data.email && data.email !== existing.email) {
    const taken = await prisma.user.findUnique({ where: { email: data.email } });
    if (taken) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }
  if (data.username !== undefined && data.username !== existing.username) {
    if (data.username) {
      const taken = await prisma.user.findUnique({ where: { username: data.username } });
      if (taken) return NextResponse.json({ error: "Username already in use" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, username: true, firstname: true, lastname: true, blocked: true, roleId: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
