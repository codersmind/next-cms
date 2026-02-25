import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");

const mime: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, ...pathSegments);
  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(pathSegments[pathSegments.length - 1]).toLowerCase();
    const contentType = mime[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
