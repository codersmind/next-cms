import { updateDocument } from "./document-service";

/** Configured in admin on inbound webhooks — runs after secret verification. */
export interface WebhookInboundActions {
  updateDocument?: {
    enabled: boolean;
    /** Content type plural API id, e.g. "payments" */
    contentType: string;
    /** Dot path in webhook JSON to CMS documentId, e.g. "documentId" or "data.orderId" */
    documentIdPath: string;
    /** Only update when payload field matches (e.g. path "pay" value true). Omit to always update. */
    successPath?: string;
    successValue?: string;
    /** Static fields merged into the document */
    fieldUpdates: Record<string, unknown>;
    /** Map CMS field name → dot path in webhook JSON, e.g. { "tracking": "data.trackingId" } */
    copyFromPayload?: Record<string, string>;
    /** Set publishedAt to now after update */
    publish?: boolean;
  };
  /** Optional custom handler from src/lib/webhook-handlers/ (e.g. plugin.sendEmail) */
  handler?: string;
  /** Handler-specific config. For plugin.sendEmail: pluginId, toPath, templateKey, subject, html */
  handlerOptions?: Record<string, unknown>;
}

export type InboundActionResult = {
  processed: boolean;
  skipped?: boolean;
  reason?: string;
  documentId?: string;
  contentType?: string;
  updatedFields?: string[];
  error?: string;
};

export function parseInboundActions(raw: string | null | undefined): WebhookInboundActions | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as WebhookInboundActions;
  } catch {
    return null;
  }
}

export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur: unknown = obj;
  for (const key of parts) {
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function parseConfigValue(raw: string | undefined): unknown {
  if (raw == null || raw === "") return undefined;
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  }
  return t;
}

function valuesMatch(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (String(actual) === String(expected)) return true;
  if (expected === true && (actual === true || actual === "true" || actual === 1)) return true;
  if (expected === false && (actual === false || actual === "false" || actual === 0)) return true;
  return false;
}

export async function runUpdateDocumentAction(
  payload: Record<string, unknown>,
  config: NonNullable<WebhookInboundActions["updateDocument"]>
): Promise<InboundActionResult> {
  if (!config.enabled) {
    return { processed: false, skipped: true, reason: "Action disabled" };
  }

  const pluralId = config.contentType.trim().toLowerCase();
  if (!pluralId) {
    return { processed: false, error: "contentType required in webhook action" };
  }

  if (config.successPath?.trim()) {
    const actual = getValueByPath(payload, config.successPath);
    const expected = parseConfigValue(config.successValue);
    if (!valuesMatch(actual, expected)) {
      return {
        processed: false,
        skipped: true,
        reason: `Success condition not met: ${config.successPath} is ${JSON.stringify(actual)}`,
      };
    }
  }

  const documentIdRaw = getValueByPath(payload, config.documentIdPath);
  const documentId =
    typeof documentIdRaw === "string"
      ? documentIdRaw.trim()
      : documentIdRaw != null
        ? String(documentIdRaw).trim()
        : "";
  if (!documentId) {
    return {
      processed: false,
      error: `documentId not found at path "${config.documentIdPath}"`,
    };
  }

  const fieldUpdates: Record<string, unknown> = { ...(config.fieldUpdates ?? {}) };

  if (config.copyFromPayload) {
    for (const [docField, payloadPath] of Object.entries(config.copyFromPayload)) {
      if (!docField.trim() || !payloadPath.trim()) continue;
      const value = getValueByPath(payload, payloadPath.trim());
      if (value !== undefined) {
        fieldUpdates[docField.trim()] = value;
      }
    }
  }

  if (Object.keys(fieldUpdates).length === 0) {
    return { processed: false, error: "fieldUpdates and copyFromPayload produced no fields" };
  }

  try {
    const result = await updateDocument(pluralId, documentId, fieldUpdates, {
      ...(config.publish ? { publishedAt: new Date() } : {}),
    });
    if (!result) {
      return {
        processed: false,
        documentId,
        contentType: pluralId,
        error: "Document not found or update failed",
      };
    }
    return {
      processed: true,
      documentId,
      contentType: pluralId,
      updatedFields: Object.keys(fieldUpdates),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return { processed: false, documentId, contentType: pluralId, error: message };
  }
}

export async function processInboundWebhookActions(
  actionsRaw: string | null | undefined,
  payload: Record<string, unknown>,
  headers: Record<string, string>
): Promise<InboundActionResult> {
  const actions = parseInboundActions(actionsRaw);
  if (!actions) {
    return { processed: false, skipped: true, reason: "No actions configured" };
  }

  if (actions.handler?.trim()) {
    const { runWebhookHandler } = await import("./webhook-handlers/registry");
    const handlerResult = await runWebhookHandler(actions.handler.trim(), {
      payload,
      headers,
      actions,
    });
    if (handlerResult) return handlerResult;
  }

  if (actions.updateDocument) {
    return runUpdateDocumentAction(payload, actions.updateDocument);
  }

  return { processed: false, skipped: true, reason: "No runnable action" };
}

