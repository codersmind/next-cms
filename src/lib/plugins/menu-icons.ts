import * as LucideIcons from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Puzzle, type LucideIcon } from "lucide-react";

/** All Lucide kebab-case names (same as lucide.dev / plugin.json admin.menu.icon) */
export const LUCIDE_ICON_KEBAB_NAMES = Object.keys(dynamicIconImports).sort();

function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function humanizeKebab(kebab: string): string {
  return kebab
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildIconMap(): Record<string, LucideIcon> {
  const map: Record<string, LucideIcon> = {};
  for (const kebab of LUCIDE_ICON_KEBAB_NAMES) {
    const pascal = kebabToPascal(kebab);
    const icon = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[pascal];
    if (icon) map[kebab] = icon;
  }
  return map;
}

/** Resolved Lucide components keyed by admin.menu.icon string */
export const PLUGIN_MENU_ICONS: Record<string, LucideIcon> = buildIconMap();

export const PLUGIN_MENU_ICON_NAMES = LUCIDE_ICON_KEBAB_NAMES;

export type PluginMenuIconMeta = {
  name: string;
  label: string;
  keywords: string;
};

export const PLUGIN_MENU_ICON_LIST: PluginMenuIconMeta[] = LUCIDE_ICON_KEBAB_NAMES.map(
  (name) => ({
    name,
    label: humanizeKebab(name),
    keywords: name.replace(/-/g, " "),
  })
);

export function filterPluginMenuIcons(query: string): PluginMenuIconMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLUGIN_MENU_ICON_LIST;
  return PLUGIN_MENU_ICON_LIST.filter(
    (item) =>
      item.name.includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
  );
}

export function resolvePluginMenuIcon(name: string | undefined): LucideIcon {
  const key = (name ?? "puzzle").trim().toLowerCase();
  return PLUGIN_MENU_ICONS[key] ?? Puzzle;
}
