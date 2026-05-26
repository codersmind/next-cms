import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { listEnabledPluginsForMenu } from "@/lib/plugins/registry";

/** Menu items for any authenticated admin user (per-plugin access checked on pages). */
export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listEnabledPluginsForMenu(user);
  return NextResponse.json(items);
}
