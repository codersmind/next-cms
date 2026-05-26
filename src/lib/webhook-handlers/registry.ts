import type { WebhookInboundActions, InboundActionResult } from "../webhook-inbound-actions";
import { runUpdateDocumentAction } from "../webhook-inbound-actions";

export type WebhookHandlerContext = {
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  actions: WebhookInboundActions;
};

type WebhookHandlerFn = (ctx: WebhookHandlerContext) => Promise<InboundActionResult>;

const handlers = new Map<string, WebhookHandlerFn>();

export function registerWebhookHandler(name: string, fn: WebhookHandlerFn): void {
  handlers.set(name, fn);
}

function resolveUpdateConfig(ctx: WebhookHandlerContext) {
  const opts = ctx.actions.handlerOptions ?? {};
  const base = ctx.actions.updateDocument;
  return (
    base ?? {
      enabled: true,
      contentType: String(opts.contentType ?? ""),
      documentIdPath: String(opts.documentIdPath ?? "documentId"),
      successPath: opts.successPath as string | undefined,
      successValue: opts.successValue as string | undefined,
      fieldUpdates: (opts.fieldUpdates as Record<string, unknown>) ?? {},
      copyFromPayload: (opts.copyFromPayload as Record<string, string>) ?? {},
      publish: !!opts.publish,
    }
  );
}

/** Generic: update any content type using actions.updateDocument config. */
registerWebhookHandler("document.updateOnMatch", async (ctx) => {
  const cfg = resolveUpdateConfig(ctx);
  if (!cfg.contentType?.trim()) {
    return { processed: false, error: "contentType required in webhook action config" };
  }
  return runUpdateDocumentAction(ctx.payload, cfg);
});

/** Backward-compatible alias */
registerWebhookHandler("payment.markPaid", async (ctx) => {
  const cfg = resolveUpdateConfig(ctx);
  return runUpdateDocumentAction(ctx.payload, cfg);
});

export async function runWebhookHandler(
  name: string,
  ctx: WebhookHandlerContext
): Promise<InboundActionResult | null> {
  const fn = handlers.get(name);
  if (!fn) {
    return {
      processed: false,
      error: `Unknown webhook handler "${name}". Register it in src/lib/webhook-handlers/registry.ts`,
    };
  }
  return fn(ctx);
}
