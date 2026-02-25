import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(_req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await prisma.$executeRaw`DELETE FROM MediaFolder WHERE id = ${id}`;
    if (result === 0) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("MediaFolder DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
