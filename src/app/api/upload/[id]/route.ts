import { NextRequest, NextResponse } from "next/server";
import { unlink, rename, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const FILES_PREFIX = "/api/upload/files/";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(media);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const newFolder = (body.folder ?? "").trim();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldPath = media.url.startsWith(FILES_PREFIX)
    ? path.join(UPLOAD_DIR, ...media.url.slice(FILES_PREFIX.length).split("/"))
    : path.join(UPLOAD_DIR, media.hash);
  const newDir = newFolder ? path.join(UPLOAD_DIR, newFolder) : UPLOAD_DIR;
  const newPath = newFolder ? path.join(newDir, media.hash) : path.join(UPLOAD_DIR, media.hash);
  const newUrl = newFolder ? `${FILES_PREFIX}${newFolder}/${media.hash}` : `${FILES_PREFIX}${media.hash}`;

  if (oldPath === newPath) {
    return NextResponse.json(media);
  }

  try {
    await mkdir(path.dirname(newPath), { recursive: true });
    await rename(oldPath, newPath);
  } catch (err) {
    console.error("Move file error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to move file" },
      { status: 500 }
    );
  }

  try {
    const updated = await prisma.media.update({
      where: { id },
      data: { folder: newFolder, url: newUrl },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update media error:", err);
    return NextResponse.json({ error: "Failed to update media record" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const filePath = media.url.startsWith(FILES_PREFIX)
    ? path.join(UPLOAD_DIR, ...media.url.slice(FILES_PREFIX.length).split("/"))
    : path.join(UPLOAD_DIR, media.hash);

  try {
    await unlink(filePath);
  } catch (err) {
    // File may already be missing
  }

  await prisma.media.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
