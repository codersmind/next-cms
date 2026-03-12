import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, username: true, firstname: true, lastname: true, roleId: true, blocked: true, createdAt: true },
  });
  if (!full) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(full);
}
