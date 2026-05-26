"use client";

import Link from "next/link";
import type { PluginAutomation } from "@/lib/plugins/types";

export function PluginAutomationsPanel({
  pluginId,
  automations,
}: {
  pluginId: string;
  automations: PluginAutomation[];
}) {
  if (!automations.length) return null;

  return (
    <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="text-sm font-medium text-white">Automations</h2>
      <p className="text-xs text-zinc-500 mt-1 mb-3">
        Defined in this plugin&apos;s <code className="text-zinc-400">plugin.json</code>. Connect them in{" "}
        <Link href="/admin/webhooks" className="text-indigo-400 hover:text-indigo-300">
          Webhooks
        </Link>{" "}
        → inbound → load <strong>{pluginId}</strong> automation.
      </p>
      <ul className="space-y-2">
        {automations.map((a) => (
          <li
            key={a.id}
            className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
          >
            <p className="text-zinc-200 font-medium">{a.label}</p>
            {a.description && <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>}
            <p className="text-xs text-zinc-600 mt-1 font-mono">
              {a.action.handler}
              {a.trigger?.event ? ` · trigger: ${a.trigger.event}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
