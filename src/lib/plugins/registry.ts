import { prisma } from "../prisma";
import type { UserWithRole } from "../auth";
import { canUsePlugin } from "./access";
import type { InstalledPlugin, PluginManifest } from "./types";
import { parseManifestJson } from "./manifest";
import { getPluginDir } from "./paths";

export async function listPlugins(): Promise<InstalledPlugin[]> {
  const rows = await prisma.plugin.findMany({ orderBy: { name: "asc" } });
  return rows.map(rowToInstalled);
}

export async function listEnabledPluginsForMenu(
  user?: UserWithRole | null
): Promise<
  { pluginId: string; label: string; icon: string; order: number; href: string }[]
> {
  const rows = await prisma.plugin.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });
  const items: { pluginId: string; label: string; icon: string; order: number; href: string }[] =
    [];
  for (const r of rows) {
    if (user && !(await canUsePlugin(user, r.pluginId))) continue;
    const m = parseManifestJson(r.manifest);
    items.push({
      pluginId: r.pluginId,
      label: m.admin.menu.label,
      icon: m.admin.menu.icon ?? "puzzle",
      order: m.admin.menu.order ?? 100,
      href: `/admin/plugins/${r.pluginId}`,
    });
  }
  return items.sort((a, b) => a.order - b.order);
}

export async function getPluginByPluginId(pluginId: string): Promise<InstalledPlugin | null> {
  const row = await prisma.plugin.findUnique({ where: { pluginId } });
  return row ? rowToInstalled(row) : null;
}

export async function getPluginDbId(pluginId: string): Promise<string | null> {
  const row = await prisma.plugin.findUnique({
    where: { pluginId },
    select: { id: true },
  });
  return row?.id ?? null;
}

export function getPluginFilesystemPath(plugin: InstalledPlugin): string {
  return getPluginDir(plugin.installPath);
}

function rowToInstalled(row: {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  enabled: boolean;
  manifest: string;
  installPath: string;
  createdAt: Date;
  updatedAt: Date;
}): InstalledPlugin {
  return {
    id: row.id,
    pluginId: row.pluginId,
    name: row.name,
    version: row.version,
    description: row.description,
    author: row.author,
    enabled: row.enabled,
    manifest: parseManifestJson(row.manifest),
    installPath: row.installPath,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
