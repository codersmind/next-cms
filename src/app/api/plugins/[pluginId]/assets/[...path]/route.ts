import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getPluginByPluginId, getPluginFilesystemPath } from "@/lib/plugins/registry";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path: segments } = await params;
  const plugin = await getPluginByPluginId(pluginId);
  if (!plugin?.enabled) return new NextResponse("Not found", { status: 404 });

  const rel = segments.join("/");
  if (rel.includes("..")) return new NextResponse("Forbidden", { status: 403 });

  const full = path.join(getPluginFilesystemPath(plugin), rel);
  try {
    const buf = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    return new NextResponse(buf, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
