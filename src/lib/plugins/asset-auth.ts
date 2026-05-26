import type { NextRequest } from "next/server";
import { getUserWithRoleFromRequest, verifyToken } from "../auth";
import { canUsePlugin } from "./access";

export async function authorizePluginAssetRequest(
  req: NextRequest,
  pluginId: string
): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const user = await getUserWithRoleFromRequest(authHeader);
    return !!user && (await canUsePlugin(user, pluginId));
  }
  const token = req.nextUrl.searchParams.get("access_token")?.trim();
  if (!token) return false;
  const payload = await verifyToken(token);
  if (!payload) return false;
  const user = await getUserWithRoleFromRequest(`Bearer ${token}`);
  return !!user && (await canUsePlugin(user, pluginId));
}

/** Paths served to authenticated users (no plugin.json at root). */
export function isAllowedPluginAssetPath(rel: string): boolean {
  if (rel === "README.md") return true;
  if (rel.startsWith("admin/")) return true;
  return false;
}
