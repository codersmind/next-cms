import { getValueByPath, type InboundActionResult } from "../webhook-inbound-actions";
import { getPluginDbId } from "../plugins/registry";
import { getPluginData } from "../plugins/data";
import { sendPluginEmail } from "../plugins/email";

export type SendPluginEmailHandlerOptions = {
  /** Plugin id (required; set automatically when using plugin automations) */
  pluginId?: string;
  /** Fixed recipient (supports {{entry.field}} placeholders) */
  to?: string;
  /** Dot path to recipient email in webhook JSON (default: entry.email) */
  toPath?: string;
  /** Fixed subject, or use {{entry.field}} placeholders */
  subject?: string;
  /** Fixed HTML body, or use {{entry.field}} placeholders */
  html?: string;
  /** Dot path for subject string in payload */
  subjectPath?: string;
  /** Dot path for HTML in payload */
  htmlPath?: string;
  /** Load subject/body from plugin storage collection */
  templateKey?: string;
  /** Plugin data collection for templates (default: templates) */
  templateCollection?: string;
};

function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, raw: string) => {
    const path = raw.trim();
    const value = getValueByPath(payload, path);
    return value != null && value !== "" ? String(value) : "";
  });
}

async function loadTemplate(
  pluginId: string,
  collection: string,
  key: string
): Promise<{ subject: string; html: string } | null> {
  const dbId = await getPluginDbId(pluginId);
  if (!dbId) return null;
  const raw = await getPluginData(dbId, collection, key);
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const subject = typeof t.subject === "string" ? t.subject : "";
  const html =
    typeof t.body === "string"
      ? t.body
      : typeof t.html === "string"
        ? t.html
        : "";
  if (!subject && !html) return null;
  return { subject, html };
}

export async function runSendPluginEmailAction(
  payload: Record<string, unknown>,
  opts: SendPluginEmailHandlerOptions
): Promise<InboundActionResult> {
  const pluginId = String(opts.pluginId ?? "").trim();
  if (!pluginId) {
    return { processed: false, error: "handlerOptions.pluginId is required" };
  }
  let to = "";
  if (opts.to != null && String(opts.to).trim()) {
    to = interpolate(String(opts.to).trim(), payload).trim();
  } else {
    const toPath = (opts.toPath ?? "entry.email").trim();
    const toRaw = getValueByPath(payload, toPath);
    to =
      typeof toRaw === "string"
        ? toRaw.trim()
        : toRaw != null
          ? String(toRaw).trim()
          : "";
    if (!to || !to.includes("@")) {
      return {
        processed: false,
        error: `Valid email not found at path "${toPath}" (or set handlerOptions.to)`,
      };
    }
  }
  if (!to.includes("@")) {
    return { processed: false, error: "Invalid recipient email" };
  }

  let subject = opts.subject ?? "";
  let html = opts.html ?? "";

  if (opts.templateKey?.trim()) {
    const collection = (opts.templateCollection ?? "templates").trim();
    const tpl = await loadTemplate(pluginId, collection, opts.templateKey.trim());
    if (!tpl) {
      return {
        processed: false,
        error: `Template "${opts.templateKey}" not found in plugin "${pluginId}"`,
      };
    }
    if (!subject) subject = tpl.subject;
    if (!html) html = tpl.html;
  }

  if (opts.subjectPath?.trim()) {
    const v = getValueByPath(payload, opts.subjectPath.trim());
    if (typeof v === "string" && v.trim()) subject = v.trim();
  }
  if (opts.htmlPath?.trim()) {
    const v = getValueByPath(payload, opts.htmlPath.trim());
    if (typeof v === "string" && v.trim()) html = v.trim();
  }

  subject = interpolate(subject, payload).trim();
  html = interpolate(html, payload).trim();

  if (!subject) subject = "Notification";
  if (!html) html = "<p>Thank you.</p>";

  const result = await sendPluginEmail(pluginId, { to, subject, html });
  if (!result.ok) {
    return { processed: false, error: result.error ?? "Email send failed" };
  }

  return {
    processed: true,
    reason: `Email sent to ${to} (${result.messageId ?? "ok"})`,
  };
}
