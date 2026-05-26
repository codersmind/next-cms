import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { sanitizeUploadFolder } from "@/lib/security/path";
import { getStorageForMedia, providerKeyFromMedia } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "media-folders.read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(media);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "media-folders.read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  let newFolder = "";
  try {
    newFolder = sanitizeUploadFolder(body.folder ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (newFolder === media.folder) {
    return NextResponse.json(media);
  }

  const storage = getStorageForMedia(media);
  const providerKey = providerKeyFromMedia(media);

  try {
    const moved = await storage.move({
      providerKey,
      hash: media.hash,
      fromFolder: media.folder,
      toFolder: newFolder,
    });
    const updated = await prisma.media.update({
      where: { id },
      data: {
        folder: newFolder,
        url: moved.url,
        providerKey: moved.providerKey,
        storage: moved.storage,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Move file error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to move file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "upload.delete");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  try {
    await getStorageForMedia(media).delete(providerKeyFromMedia(media));
  } catch (err) {
    console.error("Delete file error:", err);
  }

  await prisma.media.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
