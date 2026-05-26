import { createHmac, randomBytes } from "crypto";
import { timingSafeEqualString } from "./security/secrets";
import { assertSafeWebhookUrl } from "./security/ssrf";
import { prisma } from "./prisma";
import { isValidWebhookEvent } from "./webhook-events";
import { processInboundWebhookActions } from "./webhook-inbound-actions";

const MAX_LOG_CHARS = 4000;
const DELIVERY_TIMEOUT_MS = 15000;

export type WebhookPayload = {
  event: string;
  createdAt: string;
  model: string;
  entry: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

function truncate(s: string, max = MAX_LOG_CHARS): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseHeaders(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "string") out[k] = val;
    }
    return out;
  } catch {
    return {};
  }
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function webhookMatchesEvent(
  webhook: { events: string; contentTypes: string | null; enabled: boolean; direction: string },
  event: string,
  pluralId: string | null
): boolean {
  if (!webhook.enabled || webhook.direction !== "outbound") return false;
  const events = parseJsonArray(webhook.events);
  if (!events.includes(event)) return false;
  const types = parseJsonArray(webhook.contentTypes);
  if (types.length > 0 && pluralId && !types.includes(pluralId.toLowerCase())) {
    return false;
  }
  return true;
}

async function logDelivery(
  webhookId: string,
  event: string,
  direction: "outbound" | "inbound",
  result: {
    success: boolean;
    statusCode?: number;
    durationMs?: number;
    error?: string;
    requestBody?: string;
    responseBody?: string;
  }
) {
  await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      direction,
      success: result.success,
      statusCode: result.statusCode ?? null,
      durationMs: result.durationMs ?? null,
      error: result.error ? truncate(result.error, 500) : null,
      requestBody: result.requestBody ? truncate(result.requestBody) : null,
      responseBody: result.responseBody ? truncate(result.responseBody) : null,
    },
  });
}

export async function deliverOutboundWebhook(
  webhookId: string,
  event: string,
  payload: WebhookPayload
): Promise<void> {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook?.enabled || webhook.direction !== "outbound" || !webhook.url?.trim()) {
    return;
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Next-CMS-Webhooks/1.0",
    "X-Webhook-Event": event,
    "X-Webhook-Id": webhook.id,
    ...parseHeaders(webhook.headers),
  };

  if (webhook.secret) {
    const signature = signWebhookPayload(webhook.secret, body);
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  try {
    assertSafeWebhookUrl(webhook.url.trim());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid webhook URL";
    await logDelivery(webhookId, event, "outbound", {
      success: false,
      error: message,
    });
    return;
  }

  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    const res = await fetch(webhook.url.trim(), {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const responseText = await res.text().catch(() => "");
    await logDelivery(webhookId, event, "outbound", {
      success: res.ok,
      statusCode: res.status,
      durationMs: Date.now() - started,
      requestBody: body,
      responseBody: responseText,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delivery failed";
    await logDelivery(webhookId, event, "outbound", {
      success: false,
      durationMs: Date.now() - started,
      requestBody: body,
      error: message,
    });
  }
}

/** Dispatch all matching outbound webhooks (non-blocking). */
export async function dispatchWebhooks(
  event: string,
  payload: Omit<WebhookPayload, "event" | "createdAt"> & { event?: string }
): Promise<void> {
  if (!isValidWebhookEvent(event) && event !== "inbound.received") return;

  const pluralId =
    typeof payload.model === "string" ? payload.model.toLowerCase() : null;

  const webhooks = await prisma.webhook.findMany({
    where: { direction: "outbound", enabled: true },
  });

  const fullPayload: WebhookPayload = {
    event,
    createdAt: new Date().toISOString(),
    model: payload.model,
    entry: payload.entry,
    meta: payload.meta,
  };

  const tasks = webhooks
    .filter((w) => webhookMatchesEvent(w, event, pluralId))
    .map((w) => deliverOutboundWebhook(w.id, event, fullPayload));

  await Promise.allSettled(tasks);
}

export function dispatchWebhooksAsync(
  event: string,
  payload: Omit<WebhookPayload, "event" | "createdAt">
): void {
  void dispatchWebhooks(event, payload).catch((err) => {
    console.error("[webhooks] dispatch failed:", err);
  });
}

export async function dispatchDocumentWebhooks(
  event: string,
  opts: {
    pluralId: string;
    singularId?: string;
    entry: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  dispatchWebhooksAsync(event, {
    model: opts.pluralId,
    entry: opts.entry,
    meta: {
      singularId: opts.singularId,
      ...opts.meta,
    },
  });
}

export function verifyInboundSecret(
  webhook: { secret: string | null },
  reqSecret: string | null
): boolean {
  const expected = webhook.secret?.trim();
  if (!expected) return false;
  const provided = reqSecret?.trim();
  if (!provided) return false;
  return timingSafeEqualString(expected, provided);
}

/** Handle POST from external service (any third-party integration). */
export async function receiveInboundWebhook(
  webhookId: string,
  rawBody: string,
  headers: Record<string, string>
): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  body?: Record<string, unknown>;
}> {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook || webhook.direction !== "inbound" || !webhook.enabled) {
    return { ok: false, status: 404, error: "Webhook not found" };
  }

  const secretHeader =
    headers["x-webhook-secret"] ??
    headers["authorization"]?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!verifyInboundSecret(webhook, secretHeader)) {
    await logDelivery(webhook.id, "inbound.received", "inbound", {
      success: false,
      statusCode: 401,
      requestBody: rawBody,
      error: "Invalid or missing webhook secret",
    });
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  let parsed: unknown = rawBody;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    /* keep raw string */
  }

  const entry =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { payload: parsed };

  const actionResult = await processInboundWebhookActions(webhook.actions, entry, headers);

  const responseBody = {
    received: true,
    action: actionResult,
  };

  const deliveryOk = actionResult.error ? false : true;
  await logDelivery(webhook.id, "inbound.received", "inbound", {
    success: deliveryOk,
    statusCode: actionResult.error ? 422 : 200,
    requestBody: rawBody,
    responseBody: JSON.stringify(responseBody),
    error: actionResult.error,
  });

  dispatchWebhooksAsync("inbound.received", {
    model: webhook.name,
    entry,
    meta: {
      webhookId: webhook.id,
      webhookName: webhook.name,
      action: actionResult,
      headers: Object.fromEntries(
        Object.entries(headers).filter(([k]) => k.startsWith("x-") || k === "content-type")
      ),
    },
  });

  if (actionResult.error) {
    return { ok: false, status: 422, error: actionResult.error, body: responseBody };
  }

  return { ok: true, status: 200, body: responseBody };
}

export async function sendTestWebhook(webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
}> {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook || webhook.direction !== "outbound" || !webhook.url?.trim()) {
    return { success: false, error: "Outbound webhook with URL required" };
  }

  const payload: WebhookPayload = {
    event: "webhook.test",
    createdAt: new Date().toISOString(),
    model: "test",
    entry: { message: "Test delivery from Next-CMS" },
    meta: { webhookId: webhook.id, webhookName: webhook.name },
  };

  await deliverOutboundWebhook(webhook.id, "webhook.test", payload);
  const last = await prisma.webhookDelivery.findFirst({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
  });
  return {
    success: last?.success ?? false,
    statusCode: last?.statusCode ?? undefined,
    error: last?.error ?? undefined,
  };
}
