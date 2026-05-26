import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { listPluginAutomations } from "@/lib/plugins/automations";

export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listPluginAutomations();
  return NextResponse.json(items);
}
