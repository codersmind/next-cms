import type { WebhookInboundActions } from "../webhook-inbound-actions";
import type { PluginAutomation } from "./types";

/** Client + server: build inbound webhook JSON from a plugin manifest automation. */
export function inboundActionsFromAutomation(
  pluginId: string,
  automation: PluginAutomation
): WebhookInboundActions {
  const handler = automation.action.handler;
  const handlerOptions: Record<string, unknown> = {
    pluginId,
    ...(automation.action.options ?? {}),
  };
  return { handler, handlerOptions };
}
