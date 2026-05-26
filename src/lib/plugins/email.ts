import nodemailer from "nodemailer";
import { getPluginByPluginId, getPluginDbId } from "./registry";
import { getPluginData } from "./data";

export type SmtpSettings = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
};

export async function getPluginSmtpSettings(pluginId: string): Promise<SmtpSettings> {
  const dbId = await getPluginDbId(pluginId);
  if (!dbId) return {};
  const data = await getPluginData(dbId, "settings", "smtp");
  return (data as SmtpSettings) ?? {};
}

export async function sendPluginEmail(
  pluginId: string,
  opts: { to: string; subject: string; html: string; text?: string }
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const plugin = await getPluginByPluginId(pluginId);
  if (!plugin?.enabled) return { ok: false, error: "Plugin not enabled" };

  const smtp = await getPluginSmtpSettings(pluginId);
  if (!smtp.host?.trim()) {
    return { ok: false, error: "SMTP not configured in plugin settings" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? (smtp.secure ? 465 : 587),
    secure: !!smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? "" } : undefined,
  });

  try {
    const info = await transporter.sendMail({
      from: smtp.from ?? smtp.user,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}
