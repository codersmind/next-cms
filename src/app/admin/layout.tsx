"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  FileText,
  Image,
  ChevronRight,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content-type-builder", label: "Content-Type Builder", icon: Boxes },
  { href: "/admin/content-manager", label: "Content Manager", icon: FileText },
  { href: "/admin/media-library", label: "Media Library", icon: Image },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-zinc-950">
        <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <Link
              href="/admin"
              className="text-lg font-semibold text-white hover:text-zinc-200"
            >
              Next-CMS
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-5xl mx-auto p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
