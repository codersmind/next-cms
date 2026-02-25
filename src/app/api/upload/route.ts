import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { randomBytes } from "crypto";

// Resolve to absolute path so directory creation works from any cwd (e.g. Windows)
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");

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

/** Folder structure: uploads/YYYY/MM/ */
function getDateFolder(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("files") ?? formData.get("file") ?? formData.get("files[]");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  const f = file as File;
  const buffer = Buffer.from(await f.arrayBuffer());
  const mime = f.type || "application/octet-stream";
  const ext = getExt(mime) || path.extname(f.name) || "";
  const hash = randomBytes(8).toString("hex") + ext;
  const folderParam = (formData.get("folder") as string)?.trim();
  const folder = folderParam || getDateFolder();
  const dir = path.join(UPLOAD_DIR, folder);

  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create directory";
    console.error("Upload mkdir error:", err);
    return NextResponse.json(
      { error: `Cannot create upload directory: ${msg}. Ensure the server has write access to the project folder.` },
      { status: 500 }
    );
  }

  const filePath = path.join(dir, hash);
  try {
    await writeFile(filePath, buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to write file";
    console.error("Upload writeFile error:", err);
    return NextResponse.json(
      { error: `Cannot save file: ${msg}` },
      { status: 500 }
    );
  }

  const url = `/api/upload/files/${folder}/${hash}`;
  let media;
  try {
    media = await prisma.media.create({
      data: {
        name: f.name,
        hash,
        folder,
        ext,
        mime,
        size: buffer.length,
        url,
        width: null,
        height: null,
      },
    });
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
      folder: folder,
      ext: media.ext,
      mime: media.mime,
      size: media.size,
      url: media.url,
      width: media.width,
      height: media.height,
    },
  ]);
}

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Backward compatibility: no pagination params => return plain array
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
