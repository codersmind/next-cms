import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import {
  getAvailableStorageTypes,
  getDefaultStorageType,
  isLocalStorageEnabled,
  isS3Configured,
} from "@/lib/storage";

export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "media-folders.read");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    default: getDefaultStorageType(),
    available: getAvailableStorageTypes(),
    local: isLocalStorageEnabled(),
    s3: isS3Configured(),
  });
}
