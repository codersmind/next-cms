import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { randomBytes } from "crypto";
import { sanitizeUploadFolder } from "@/lib/security/path";
import { getUploadMaxBytes } from "@/lib/upload-dir";
import { getMediaStorage, resolveStorageType } from "@/lib/storage";

function getExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return map[mime] || "";
}

function getDateFolder(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

export async function POST(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "upload.create");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("files") ?? formData.get("file") ?? formData.get("files[]");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const f = file as File;
  const maxBytes = getUploadMaxBytes();
  if (f.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)` },
      { status: 413 }
    );
  }

  let storageType;
  try {
    storageType = resolveStorageType(formData.get("storage")?.toString());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid storage" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await f.arrayBuffer());
  const mime = f.type || "application/octet-stream";
  const ext = getExt(mime) || path.extname(f.name) || "";
  const hash = randomBytes(8).toString("hex") + ext;

  let folder: string;
  try {
    const folderParam = (formData.get("folder") as string)?.trim();
    folder = sanitizeUploadFolder(folderParam || getDateFolder());
  } catch {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  let stored;
  try {
    stored = await getMediaStorage(storageType).upload({ buffer, mime, folder, hash });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    console.error("Storage upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let media;
  const mediaData = {
    name: f.name,
    hash,
    folder,
    ext,
    mime,
    size: buffer.length,
    url: stored.url,
    storage: stored.storage,
    providerKey: stored.providerKey,
    width: null,
    height: null,
  } as Prisma.MediaCreateInput;

  try {
    media = await prisma.media.create({ data: mediaData });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    console.error("Upload prisma create error:", err);
    return NextResponse.json({ error: `Failed to save media record: ${msg}` }, { status: 500 });
  }

  return NextResponse.json([
    {
      id: media.id,
      name: media.name,
      hash: media.hash,
      folder,
      ext: media.ext,
      mime: media.mime,
      size: media.size,
      url: media.url,
      storage: stored.storage,
      width: media.width,
      height: media.height,
    },
  ]);
}

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "media-folders.read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const filter = searchParams.get("filter") ?? "all";
  const folderParam = searchParams.get("folder");
  const where: { folder?: string } = {};
  if (folderParam != null && folderParam !== "") {
    where.folder = folderParam;
  }

  let list = await prisma.media.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: "desc" },
  });

  if (search) list = list.filter((m) => m.name.toLowerCase().includes(search));
  if (filter === "images") list = list.filter((m) => m.mime.startsWith("image/"));

  if (pageParam == null && pageSizeParam == null) {
    return NextResponse.json(list);
  }

  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(pageSizeParam ?? String(PAGE_SIZE), 10)));
  const total = list.length;
  const start = (page - 1) * pageSize;
  const data = list.slice(start, start + pageSize);
  const pageCount = Math.ceil(total / pageSize);

  return NextResponse.json({
    data,
    meta: { pagination: { page, pageSize, pageCount, total } },
  });
}
