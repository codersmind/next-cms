import type { PluginAdminPage, PluginManifest } from "./types";
import { PLUGIN_ID_REGEX } from "./types";
import { parseAutomationsFromManifest } from "./automations";

export function parseManifestJson(raw: string): PluginManifest {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("plugin.json is not valid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("plugin.json must be an object");
  const m = data as Record<string, unknown>;

  const id = String(m.id ?? "").trim().toLowerCase();
  if (!PLUGIN_ID_REGEX.test(id)) {
    throw new Error("plugin.json: id must be lowercase alphanumeric (2-49 chars, start with letter)");
  }

  const name = String(m.name ?? "").trim();
  if (!name) throw new Error("plugin.json: name is required");

  const version = String(m.version ?? "").trim();
  if (!version) throw new Error("plugin.json: version is required");

  const adminRaw = m.admin;
  if (!adminRaw || typeof adminRaw !== "object") throw new Error("plugin.json: admin is required");

  const admin = adminRaw as Record<string, unknown>;
  const menuRaw = admin.menu;
  if (!menuRaw || typeof menuRaw !== "object") throw new Error("plugin.json: admin.menu is required");
  const menu = menuRaw as Record<string, unknown>;
  const menuLabel = String(menu.label ?? "").trim();
  if (!menuLabel) throw new Error("plugin.json: admin.menu.label is required");

  let pages: PluginAdminPage[] = [];
  if (Array.isArray(admin.pages)) {
    pages = admin.pages.map((p, i) => parsePage(p, i));
  }

  const settings = m.settings as PluginManifest["settings"] | undefined;
  const automations = parseAutomationsFromManifest(m);

  return {
    id,
    name,
    version,
    description: m.description != null ? String(m.description) : undefined,
    author: m.author != null ? String(m.author) : undefined,
    minCmsVersion: m.minCmsVersion != null ? String(m.minCmsVersion) : undefined,
    permissions: Array.isArray(m.permissions) ? m.permissions.map(String) : [`plugin.${id}.use`],
    capabilities: Array.isArray(m.capabilities)
      ? (m.capabilities as PluginManifest["capabilities"])
      : ["storage"],
    admin: {
      menu: {
        label: menuLabel,
        icon: menu.icon != null ? String(menu.icon) : "puzzle",
        order: typeof menu.order === "number" ? menu.order : 100,
      },
      pages,
    },
    settings,
    automations: automations.length > 0 ? automations : undefined,
  };
}

function parsePage(p: unknown, index: number): PluginAdminPage {
  if (!p || typeof p !== "object") throw new Error(`admin.pages[${index}] invalid`);
  const o = p as Record<string, unknown>;
  const type = String(o.type ?? "readme") as PluginAdminPage["type"];
  const valid = ["readme", "settings", "collection", "email-send", "html"];
  if (!valid.includes(type)) throw new Error(`admin.pages[${index}].type invalid`);

  return {
    slug: String(o.slug ?? "").trim(),
    title: String(o.title ?? `Page ${index + 1}`).trim(),
    type,
    settingsKey: o.settingsKey != null ? String(o.settingsKey) : undefined,
    collection: o.collection != null ? String(o.collection) : undefined,
    fields: Array.isArray(o.fields)
      ? o.fields.map((f) => {
          const fr = f as Record<string, unknown>;
          return {
            name: String(fr.name ?? ""),
            label: String(fr.label ?? fr.name ?? ""),
            type: (fr.type === "textarea" || fr.type === "richtext" ? fr.type : "text") as
              | "text"
              | "textarea"
              | "richtext",
          };
        })
      : undefined,
    htmlFile: validateHtmlFile(o.htmlFile),
  };
}

/** Path relative to the plugin's `admin/` folder (e.g. `app/index.html`). */
function validateHtmlFile(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  let file = String(raw).trim().replace(/\\/g, "/");
  if (!file) return undefined;
  if (file.includes("..") || file.startsWith("/")) {
    throw new Error("htmlFile must be a relative path under admin/");
  }
  if (file.startsWith("admin/")) file = file.slice("admin/".length);
  if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
    throw new Error("htmlFile must be under admin/ (e.g. app/index.html)");
  }
  return file;
}

export async function loadPagesFromFile(
  pluginDir: string,
  pagesFile: string
): Promise<PluginAdminPage[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const full = path.join(pluginDir, pagesFile);
  const raw = await fs.readFile(full, "utf8");
  const data = JSON.parse(raw) as { pages?: unknown[] };
  if (!Array.isArray(data.pages)) throw new Error(`${pagesFile}: pages array required`);
  return data.pages.map((p, i) => parsePage(p, i));
}

export function mergeManifestPages(
  manifest: PluginManifest,
  extraPages: PluginAdminPage[]
): PluginManifest {
  if (extraPages.length === 0) return manifest;
  return {
    ...manifest,
    admin: {
      ...manifest.admin,
      pages: extraPages.length > 0 ? extraPages : manifest.admin.pages,
    },
  };
}
