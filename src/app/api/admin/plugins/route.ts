import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { canManagePlugins } from "@/lib/plugins/access";
import { listPlugins } from "@/lib/plugins/registry";
import { installPluginFromZip, ensurePluginsDir } from "@/lib/plugins/install";

export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canManagePlugins(user);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensurePluginsDir();
  const { syncBundledPluginsRegistry } = await import("@/lib/plugins/install");
  await syncBundledPluginsRegistry();
  const plugins = await listPlugins();
  return NextResponse.json(plugins);
}

export async function POST(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canManagePlugins(user);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required (ZIP)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await ensurePluginsDir();
    const result = await installPluginFromZip(buffer);
    return NextResponse.json({ ok: true, pluginId: result.pluginId, manifest: result.manifest });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Install failed" },
      { status: 400 }
    );
  }
}
