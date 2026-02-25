import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    return { userId: sub };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(authHeader: string | null): Promise<{ id: string; email: string; roleId: string | null } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, roleId: true, blocked: true },
  });
  if (!user || user.blocked) return null;
  return user;
}

export type UserWithRole = { id: string; email: string; roleId: string | null; role: { id: string; name: string } | null };

/** Same as getUserFromRequest but includes role (id, name). Use when you need to check Super Admin or permissions. */
export async function getUserWithRoleFromRequest(authHeader: string | null): Promise<UserWithRole | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, roleId: true, blocked: true, role: { select: { id: true, name: true } } },
  });
  if (!user || user.blocked) return null;
  return user;
}

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/** Returns true if user has the given permission. Super Admin role has full access (all permissions). */
export async function canAccess(user: UserWithRole | null, action: string): Promise<boolean> {
  if (!user) return false;
  if (user.role?.name === SUPER_ADMIN_ROLE_NAME) return true;
  if (!user.roleId) return false;
  const perm = await prisma.permission.findFirst({
    where: { roleId: user.roleId, action, enabled: true },
  });
  return !!perm;
}
