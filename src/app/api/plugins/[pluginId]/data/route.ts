import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { canUsePlugin } from "@/lib/plugins/access";
import { getPluginByPluginId, getPluginDbId } from "@/lib/plugins/registry";
import { listPluginData, setPluginData, deletePluginData } from "@/lib/plugins/data";

export async function GET(
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

  const collection = req.nextUrl.searchParams.get("collection") ?? "default";
  const dbId = await getPluginDbId(pluginId);
  if (!dbId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await listPluginData(dbId, collection);
  return NextResponse.json({ data });
}

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

  let body: { collection?: string; key: string; value: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key?.trim()) return NextResponse.json({ error: "key required" }, { status: 400 });

  const dbId = await getPluginDbId(pluginId);
  if (!dbId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await setPluginData(dbId, body.collection ?? "default", body.key.trim(), body.value);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pluginId } = await params;
  if (!(await canUsePlugin(user, pluginId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collection = req.nextUrl.searchParams.get("collection") ?? "default";
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const dbId = await getPluginDbId(pluginId);
  if (!dbId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deletePluginData(dbId, collection, key);
  return new NextResponse(null, { status: 204 });
}
