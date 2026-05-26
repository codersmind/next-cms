import type { PluginAutomation, PluginManifest } from "./types";
import { listEnabledPluginsForMenu, getPluginByPluginId } from "./registry";

export type PluginAutomationListItem = {
  pluginId: string;
  pluginName: string;
  automationId: string;
  label: string;
  description?: string;
  trigger?: PluginAutomation["trigger"];
  handler: string;
  handlerOptions?: Record<string, unknown>;
  capabilities: string[];
};

function parseAutomation(raw: unknown, index: number): PluginAutomation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  const label = String(o.label ?? "").trim();
  if (!id || !label) return null;

  const actionRaw = o.action;
  if (!actionRaw || typeof actionRaw !== "object") return null;
  const action = actionRaw as Record<string, unknown>;
  const handler = String(action.handler ?? "").trim();
  if (!handler) return null;

  let options: Record<string, unknown> | undefined;
  if (action.options && typeof action.options === "object" && !Array.isArray(action.options)) {
    options = action.options as Record<string, unknown>;
  }

  let trigger: PluginAutomation["trigger"];
  if (o.trigger && typeof o.trigger === "object" && !Array.isArray(o.trigger)) {
    const t = o.trigger as Record<string, unknown>;
    const event = String(t.event ?? "").trim();
    if (event) {
      trigger = {
        event,
        contentTypes: Array.isArray(t.contentTypes)
          ? t.contentTypes.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
          : undefined,
      };
    }
  }

  return {
    id,
    label,
    description: o.description != null ? String(o.description) : undefined,
    trigger,
    action: { handler, options },
  };
}

export function parseAutomationsFromManifest(data: Record<string, unknown>): PluginAutomation[] {
  if (!Array.isArray(data.automations)) return [];
  const out: PluginAutomation[] = [];
  for (let i = 0; i < data.automations.length; i++) {
    const a = parseAutomation(data.automations[i], i);
    if (a) out.push(a);
  }
  return out;
}

export function getManifestAutomations(manifest: PluginManifest): PluginAutomation[] {
  return manifest.automations ?? [];
}

export async function listPluginAutomations(): Promise<PluginAutomationListItem[]> {
  const menu = await listEnabledPluginsForMenu();
  const items: PluginAutomationListItem[] = [];

  for (const m of menu) {
    const plugin = await getPluginByPluginId(m.pluginId);
    if (!plugin?.enabled) continue;
    const automations = getManifestAutomations(plugin.manifest);
    for (const a of automations) {
      items.push({
        pluginId: plugin.pluginId,
        pluginName: plugin.name,
        automationId: a.id,
        label: a.label,
        description: a.description,
        trigger: a.trigger,
        handler: a.action.handler,
        handlerOptions: a.action.options,
        capabilities: plugin.manifest.capabilities ?? [],
      });
    }
  }

  return items;
}

export async function getAutomationByIds(
  pluginId: string,
  automationId: string
): Promise<{ plugin: Awaited<ReturnType<typeof getPluginByPluginId>>; automation: PluginAutomation } | null> {
  const plugin = await getPluginByPluginId(pluginId);
  if (!plugin) return null;
  const automation = getManifestAutomations(plugin.manifest).find((a) => a.id === automationId);
  if (!automation) return null;
  return { plugin, automation };
}
