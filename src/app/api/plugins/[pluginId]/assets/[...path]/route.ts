import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getPluginByPluginId, getPluginFilesystemPath } from "@/lib/plugins/registry";
import {
  authorizePluginAssetRequest,
  isAllowedPluginAssetPath,
} from "@/lib/plugins/asset-auth";
import { assertInsideRoot, normalizeRelativePath } from "@/lib/security/path";
import { rewritePluginHtmlWithAccessToken } from "@/lib/plugins/html-assets";

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

  if (!(await authorizePluginAssetRequest(req, plugin.pluginId))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let rel: string;
  try {
    rel = normalizeRelativePath(segments);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isAllowedPluginAssetPath(rel)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const root = getPluginFilesystemPath(plugin);
  let full: string;
  try {
    full = assertInsideRoot(root, rel);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.lstat(full);
    if (stat.isSymbolicLink()) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const buf = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    const headers: Record<string, string> = {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    let responseBody: BodyInit = buf;
    if (ext === ".html") {
      const token = req.nextUrl.searchParams.get("access_token")?.trim();
      let html = buf.toString("utf8");
      if (token) {
        html = rewritePluginHtmlWithAccessToken(html, pluginId, rel, token);
      }
      responseBody = html;
      headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'";
    }
    return new NextResponse(responseBody, { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
