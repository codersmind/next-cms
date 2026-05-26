import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { sendTestWebhook } from "@/lib/webhook-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const result = await sendTestWebhook(id);
  if (result.error && !result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
