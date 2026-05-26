import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { canManagePlugins } from "@/lib/plugins/access";
import { getPluginByPluginId } from "@/lib/plugins/registry";
import { uninstallPlugin } from "@/lib/plugins/install";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pluginId } = await params;
  const plugin = await getPluginByPluginId(pluginId);
  if (!plugin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plugin);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canManagePlugins(user);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { pluginId } = await params;
  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.plugin.update({
    where: { pluginId },
    data: { ...(body.enabled != null && { enabled: body.enabled }) },
  });
  return NextResponse.json({ id: updated.id, pluginId: updated.pluginId, enabled: updated.enabled });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canManagePlugins(user);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { pluginId } = await params;
  await uninstallPlugin(pluginId);
  return new NextResponse(null, { status: 204 });
}
