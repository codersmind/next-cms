import { canAccess, type UserWithRole } from "../auth";
import { pluginPermission } from "./paths";

export async function canUsePlugin(user: UserWithRole | null, pluginId: string): Promise<boolean> {
  return canAccess(user, pluginPermission(pluginId));
}

export async function canManagePlugins(user: UserWithRole | null): Promise<boolean> {
  return canAccess(user, "admin.plugins");
}
