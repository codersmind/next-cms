import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { prisma } from "../prisma";
import { getPluginsRoot, getPluginDir } from "./paths";
import { parseManifestJson, loadPagesFromFile, mergeManifestPages } from "./manifest";
import type { PluginManifest } from "./types";

const MAX_ZIP_BYTES = 15 * 1024 * 1024;

function findPluginJsonEntry(entries: AdmZip.IZipEntry[]): {
  entry: AdmZip.IZipEntry;
  stripPrefix: string;
} | null {
  const jsonEntries = entries.filter((e) => !e.isDirectory && e.entryName.endsWith("plugin.json"));
  if (jsonEntries.length === 0) return null;

  const entry = jsonEntries.find((e) => e.entryName === "plugin.json") ?? jsonEntries[0];
  const dir = path.posix.dirname(entry.entryName);
  const stripPrefix = dir === "." ? "" : dir.endsWith("/") ? dir : `${dir}/`;
  return { entry, stripPrefix };
}

function safeEntryPath(name: string, stripPrefix: string): string | null {
  let rel = name;
  if (stripPrefix && rel.startsWith(stripPrefix)) rel = rel.slice(stripPrefix.length);
  rel = rel.replace(/\\/g, "/");
  if (!rel || rel.endsWith("/")) return null;
  if (rel.includes("..") || rel.startsWith("/")) return null;
  return rel;
}

export async function installPluginFromZip(buffer: Buffer): Promise<{
  pluginId: string;
  manifest: PluginManifest;
}> {
  if (buffer.length > MAX_ZIP_BYTES) {
    throw new Error("Plugin ZIP must be under 15MB");
  }

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const found = findPluginJsonEntry(entries);
  if (!found) throw new Error("ZIP must contain plugin.json at root or in one folder");

  const manifestRaw = found.entry.getData().toString("utf8");
  let manifest = parseManifestJson(manifestRaw);

  const installPath = manifest.id;
  const targetDir = getPluginDir(installPath);
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  for (const e of entries) {
    if (e.isDirectory) continue;
    const rel = safeEntryPath(e.entryName, found.stripPrefix);
    if (!rel) continue;
    const dest = path.join(targetDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, e.getData());
  }

  const pagesJsonPath = path.join(targetDir, "admin", "pages.json");
  try {
    const pages = await loadPagesFromFile(targetDir, "admin/pages.json");
    manifest = mergeManifestPages(manifest, pages);
  } catch {
    /* optional */
  }

  const finalManifestPath = path.join(targetDir, "plugin.json");
  await fs.writeFile(finalManifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const existing = await prisma.plugin.findUnique({ where: { pluginId: manifest.id } });
  const manifestStr = JSON.stringify(manifest);

  if (existing) {
    await prisma.plugin.update({
      where: { id: existing.id },
      data: {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description ?? null,
        author: manifest.author ?? null,
        manifest: manifestStr,
        installPath,
        enabled: true,
      },
    });
  } else {
    await prisma.plugin.create({
      data: {
        pluginId: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description ?? null,
        author: manifest.author ?? null,
        manifest: manifestStr,
        installPath,
        enabled: true,
      },
    });
  }

  await syncBundledPluginsRegistry();
  return { pluginId: manifest.id, manifest };
}

export async function uninstallPlugin(pluginId: string): Promise<void> {
  const row = await prisma.plugin.findUnique({ where: { pluginId } });
  if (!row) return;
  await prisma.plugin.delete({ where: { id: row.id } });
  await fs.rm(getPluginDir(row.installPath), { recursive: true, force: true });
}

export async function syncBundledPluginsRegistry(): Promise<void> {
  const root = getPluginsRoot();
  try {
    await fs.access(root);
  } catch {
    return;
  }
  const dirs = await fs.readdir(root, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const pluginJson = path.join(root, d.name, "plugin.json");
    try {
      const raw = await fs.readFile(pluginJson, "utf8");
      let manifest = parseManifestJson(raw);
      try {
        const pages = await loadPagesFromFile(path.join(root, d.name), "admin/pages.json");
        manifest = mergeManifestPages(manifest, pages);
      } catch {
        /* */
      }
      const existing = await prisma.plugin.findUnique({ where: { pluginId: manifest.id } });
      const manifestStr = JSON.stringify(manifest);
      if (!existing) {
        await prisma.plugin.create({
          data: {
            pluginId: manifest.id,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description ?? null,
            author: manifest.author ?? null,
            manifest: manifestStr,
            installPath: d.name,
            enabled: true,
          },
        });
      } else {
        await prisma.plugin.update({
          where: { pluginId: manifest.id },
          data: {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description ?? null,
            author: manifest.author ?? null,
            manifest: manifestStr,
          },
        });
      }
    } catch {
      /* not a valid plugin folder */
    }
  }
}

export async function ensurePluginsDir(): Promise<void> {
  await fs.mkdir(getPluginsRoot(), { recursive: true });
}
