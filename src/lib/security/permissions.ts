import { prisma } from "../prisma";
import { SYSTEM_PERMISSIONS, SUPER_ADMIN_ROLE_NAME } from "../permissions";
import type { UserWithRole } from "../auth";

const PLUGIN_ACTION_RE = /^plugin\.[a-z][a-z0-9-]{1,48}\.use$/;

export function isAllowedPermissionAction(action: string): boolean {
  const a = action.trim();
  if (!a) return false;
  if (SYSTEM_PERMISSIONS.some((p) => p.action === a)) return true;
  if (a.startsWith("content-type.") && a.split(".").length >= 3) return true;
  if (PLUGIN_ACTION_RE.test(a)) return true;
  return false;
}

export async function assertAssignableRole(
  actor: UserWithRole,
  roleId: string | null | undefined
): Promise<void> {
  if (!roleId) return;
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");
  if (role.name === SUPER_ADMIN_ROLE_NAME && actor.role?.name !== SUPER_ADMIN_ROLE_NAME) {
    throw new Error("Only Super Admin can assign the Super Admin role");
  }
}
