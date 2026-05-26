import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadDir } from "@/lib/upload-dir";
import { assertInsideRoot } from "@/lib/security/path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  let filePath: string;
  try {
    filePath = assertInsideRoot(getUploadDir(), hash);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(hash).toLowerCase();
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
    };
    const contentType = mime[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
