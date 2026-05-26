"use client";

import { useMemo, useState } from "react";
import { useGetPluginAutomationsQuery } from "@/store/api/cmsApi";
import { inboundActionsFromAutomation } from "@/lib/plugins/automation-actions";
import type { InboundActionFormState } from "./InboundActionsForm";

type Props = {
  onApply: (patch: Partial<InboundActionFormState>, hints?: AutomationApplyHints) => void;
};

export type AutomationApplyHints = {
  outboundEvent?: string;
  outboundContentTypes?: string[];
  pluginId: string;
  automationLabel: string;
};

export function PluginAutomationPicker({ onApply }: Props) {
  const { data: automations, isLoading } = useGetPluginAutomationsQuery();
  const [selectedKey, setSelectedKey] = useState("");

  const options = useMemo(() => {
    return (automations ?? []).map((a) => ({
      ...a,
      key: `${a.pluginId}:${a.automationId}`,
    }));
  }, [automations]);

  const selected = options.find((o) => o.key === selectedKey);

  if (isLoading) {
    return <p className="text-xs text-zinc-500">Loading plugin automations…</p>;
  }

  if (!options.length) {
    return (
      <p className="text-xs text-zinc-500">
        No automations defined. Add an <code className="text-zinc-400">automations</code> array in your
        plugin&apos;s <code className="text-zinc-400">plugin.json</code>.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Load action from installed plugin</p>
      <select
        value={selectedKey}
        onChange={(e) => {
          const key = e.target.value;
          setSelectedKey(key);
          const item = options.find((o) => o.key === key);
          if (!item) return;

          const actions = inboundActionsFromAutomation(item.pluginId, {
            id: item.automationId,
            label: item.label,
            description: item.description,
            trigger: item.trigger,
            action: {
              handler: item.handler,
              options: item.handlerOptions,
            },
          });

          onApply(
            {
              actionEnabled: true,
              actionHandler: actions.handler ?? "",
              actionHandlerOptionsJson: JSON.stringify(actions.handlerOptions ?? {}, null, 2),
            },
            {
              pluginId: item.pluginId,
              automationLabel: item.label,
              outboundEvent: item.trigger?.event,
              outboundContentTypes: item.trigger?.contentTypes,
            }
          );
        }}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
      >
        <option value="">Select plugin automation…</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.pluginName} — {o.label}
          </option>
        ))}
      </select>
      {selected?.description && (
        <p className="text-xs text-zinc-500">{selected.description}</p>
      )}
      <p className="text-xs text-zinc-600">
        Options come from the plugin manifest. Edit handler JSON below to set template keys and paths for
        your site.
      </p>
    </div>
  );
}

/** Shown after applying a plugin automation (outbound webhook hints). */
export function AutomationOutboundHints({ hints }: { hints: AutomationApplyHints | null }) {
  if (!hints) return null;
  return (
    <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-3 text-xs text-indigo-200/90 space-y-1">
      <p className="font-medium text-indigo-300">Also create an outbound webhook</p>
      <ul className="list-disc list-inside text-indigo-200/80 space-y-0.5">
        {hints.outboundEvent && <li>Event: {hints.outboundEvent}</li>}
        {hints.outboundContentTypes && hints.outboundContentTypes.length > 0 ? (
          <li>Content types: {hints.outboundContentTypes.join(", ")}</li>
        ) : (
          <li>Set content type to your public form API id</li>
        )}
        <li>URL: this inbound webhook receive URL</li>
        <li>Header: x-webhook-secret = your inbound secret</li>
      </ul>
      <p className="text-indigo-200/60 pt-1">
        Plugin <span className="text-indigo-300">{hints.pluginId}</span> — {hints.automationLabel}
      </p>
    </div>
  );
}
