import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

const SORT_FIELDS = ["email", "username", "firstname", "lastname", "createdAt", "blocked"] as const;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") ?? "25", 10) || 25));
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const sortParam = req.nextUrl.searchParams.get("sort") ?? "createdAt:desc";
  const roleId = req.nextUrl.searchParams.get("roleId")?.trim() || undefined;
  const blockedParam = req.nextUrl.searchParams.get("blocked");
  const blocked = blockedParam === "true" ? true : blockedParam === "false" ? false : undefined;

  const where: { roleId?: string; blocked?: boolean; OR?: { email?: { contains: string }; username?: { contains: string }; firstname?: { contains: string }; lastname?: { contains: string } }[] } = {};
  if (roleId) where.roleId = roleId;
  if (blocked !== undefined) where.blocked = blocked;
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { username: { contains: search } },
      { firstname: { contains: search } },
      { lastname: { contains: search } },
    ];
  }

  const [sortField, sortDir] = sortParam.split(":");
  const orderField = SORT_FIELDS.includes(sortField as (typeof SORT_FIELDS)[number]) ? sortField : "createdAt";
  const orderDir = sortDir === "asc" ? "asc" : "desc";

  const orderBy = { [orderField]: orderDir } as { createdAt?: "asc" | "desc"; email?: "asc" | "desc"; username?: "asc" | "desc"; firstname?: "asc" | "desc"; lastname?: "asc" | "desc"; blocked?: "asc" | "desc" };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, email: true, username: true, firstname: true, lastname: true, blocked: true, roleId: true, createdAt: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const roleIds = [...new Set(users.map((u) => u.roleId).filter(Boolean))] as string[];
  const roles = roleIds.length
    ? await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } })
    : [];
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));
  const data = users.map((u) => ({ ...u, roleName: u.roleId ? roleMap[u.roleId] ?? null : null }));

  return NextResponse.json({
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email: string; username?: string; password: string; firstname?: string; lastname?: string; roleId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { email, username, password, firstname, lastname, roleId } = body;
  if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: "password required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  if (username?.trim()) {
    const existingUsername = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existingUsername) return NextResponse.json({ error: "Username already in use" }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      username: username?.trim() || null,
      password: hashed,
      firstname: firstname?.trim() || null,
      lastname: lastname?.trim() || null,
      roleId: roleId || null,
    },
    select: { id: true, email: true, username: true, firstname: true, lastname: true, blocked: true, roleId: true, createdAt: true },
  });
  return NextResponse.json(created);
}
