import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { canUsePlugin } from "@/lib/plugins/access";
import { getPluginByPluginId } from "@/lib/plugins/registry";
import { sendPluginEmail } from "@/lib/plugins/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pluginId } = await params;
  if (!(await canUsePlugin(user, pluginId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const plugin = await getPluginByPluginId(pluginId);
  if (!plugin?.enabled) return NextResponse.json({ error: "Plugin disabled" }, { status: 404 });
  if (!plugin.manifest.capabilities?.includes("email")) {
    return NextResponse.json({ error: "Plugin does not support email" }, { status: 400 });
  }

  let body: { to?: string; subject?: string; html?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.to?.trim() || !body.subject?.trim() || !body.html?.trim()) {
    return NextResponse.json({ error: "to, subject, html required" }, { status: 400 });
  }

  const result = await sendPluginEmail(pluginId, {
    to: body.to.trim(),
    subject: body.subject.trim(),
    html: body.html,
    text: body.text,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
