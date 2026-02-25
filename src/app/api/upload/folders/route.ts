import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { randomBytes } from "crypto";

function pathFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/-]/g, "")
    || "folder";
}

// Use raw queries so this works even if Prisma client was not regenerated after adding MediaFolder
type MediaFolderRow = { id: string; name: string; path: string; createdAt: string; updatedAt: string };

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const folders = await prisma.$queryRaw<MediaFolderRow[]>`
      SELECT id, name, path, createdAt, updatedAt FROM MediaFolder ORDER BY path ASC
    `;
    return NextResponse.json(folders);
  } catch (err) {
    console.error("MediaFolder GET error:", err);
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name: string; parentPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const parentPath = (body.parentPath ?? "").trim();
  const path = parentPath ? `${parentPath}/${pathFromName(name)}` : pathFromName(name);
  const id = randomBytes(12).toString("base64url");
  const now = new Date().toISOString();
  try {
    const existing = await prisma.$queryRaw<MediaFolderRow[]>`
      SELECT id FROM MediaFolder WHERE path = ${path} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: "A folder with this name already exists" }, { status: 400 });
    }
    await prisma.$executeRaw`
      INSERT INTO MediaFolder (id, name, path, createdAt, updatedAt)
      VALUES (${id}, ${name}, ${path}, ${now}, ${now})
    `;
    return NextResponse.json({ id, name, path, createdAt: now, updatedAt: now });
  } catch (err) {
    console.error("MediaFolder POST error:", err);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
