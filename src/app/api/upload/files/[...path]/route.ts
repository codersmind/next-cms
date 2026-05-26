import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { normalizeRelativePath } from "@/lib/security/path";
import {
  getMediaStorage,
  getStorageForMedia,
  providerKeyFromMedia,
} from "@/lib/storage";
import {
  buildS3ObjectKey,
  getDefaultStorageType,
  isS3Configured,
} from "@/lib/storage/config";

const mime: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

const FILES_PREFIX = "/api/upload/files/";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let rel: string;
  try {
    rel = normalizeRelativePath(pathSegments);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const serveUrl = `${FILES_PREFIX}${rel}`;
  const media = await prisma.media.findFirst({
    where: {
      OR: [{ url: serveUrl }, { providerKey: rel }],
    },
  });

  try {
    let buffer: Buffer;
    if (media) {
      buffer = await getStorageForMedia(media).read(providerKeyFromMedia(media));
    } else if (isS3Configured() && getDefaultStorageType() === "s3") {
      const parts = rel.split("/");
      const hash = parts.pop()!;
      const folder = parts.join("/");
      buffer = await getMediaStorage("s3").read(buildS3ObjectKey(folder, hash));
    } else {
      buffer = await getMediaStorage("local").read(rel);
    }
    const ext = path.extname(rel).toLowerCase();
    const contentType = mime[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
