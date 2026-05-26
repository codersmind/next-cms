import { NextRequest, NextResponse } from "next/server";
import { getUserWithRoleFromRequest } from "@/lib/auth";
import { PLUGIN_MENU_ICON_LIST, PLUGIN_MENU_ICON_NAMES } from "@/lib/plugins/menu-icons";

/** Build reference: icon names, ZIP layout (for plugin authors). */
export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    menuIcons: PLUGIN_MENU_ICON_NAMES,
    menuIconList: PLUGIN_MENU_ICON_LIST,
    zipStructure: [
      "my-plugin/plugin.json",
      "my-plugin/admin/pages.json",
      "my-plugin/README.md",
      "my-plugin/admin/app/index.html (Vite build, optional)",
    ],
    docs: {
      buildGuide: "docs/BUILD-A-PLUGIN.md",
      examples: ["demo-suite", "vite-todo", "mail-sender"],
    },
  });
}
