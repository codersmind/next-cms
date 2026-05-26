import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20));

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    deliveries.map((d) => ({
      id: d.id,
      event: d.event,
      direction: d.direction,
      success: d.success,
      statusCode: d.statusCode,
      durationMs: d.durationMs,
      error: d.error,
      requestBody: d.requestBody,
      responseBody: d.responseBody,
      createdAt: d.createdAt.toISOString(),
    }))
  );
}
