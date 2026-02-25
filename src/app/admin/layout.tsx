"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  FileText,
  Image,
  Users,
  Shield,
  KeyRound,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useGetContentTypesQuery } from "@/store/api/cmsApi";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content-manager", label: "Content Manager", icon: FileText, hasSubmenu: true },
  { href: "/admin/content-type-builder", label: "Content-Type Builder", icon: Boxes },
  { href: "/admin/media-library", label: "Media Library", icon: Image },
  { href: "/admin/access", label: "Access", icon: Users, hasSubmenu: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isContentManager = pathname.startsWith("/admin/content-manager");
  const isAccess = pathname.startsWith("/admin/users") || pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/permissions");
  const [contentManagerOpen, setContentManagerOpen] = useState(isContentManager);
  const [accessOpen, setAccessOpen] = useState(isAccess);

  useEffect(() => {
    if (isContentManager) setContentManagerOpen(true);
  }, [isContentManager]);
  useEffect(() => {
    if (isAccess) setAccessOpen(true);
  }, [isAccess]);

  const { data: contentTypes } = useGetContentTypesQuery();

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
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const hasSubmenu = "hasSubmenu" in item && item.hasSubmenu;
              if (hasSubmenu && item.href === "/admin/access") {
                const isActive = isAccess;
                const Icon = item.icon;
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => setAccessOpen((o) => !o)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-400"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.label}
                      {accessOpen ? (
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      ) : (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                    {accessOpen && (
                      <div className="mt-0.5 ml-4 pl-3 border-l border-zinc-800 space-y-0.5">
                        <Link
                          href="/admin/users"
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm ${
                            pathname === "/admin/users"
                              ? "text-indigo-400"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          Users
                        </Link>
                        <Link
                          href="/admin/roles"
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm ${
                            pathname === "/admin/roles"
                              ? "text-indigo-400"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          <Shield className="w-4 h-4 shrink-0" />
                          Roles
                        </Link>
                        <Link
                          href="/admin/permissions"
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm ${
                            pathname.startsWith("/admin/permissions")
                              ? "text-indigo-400"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          <KeyRound className="w-4 h-4 shrink-0" />
                          Permissions
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }
              if (hasSubmenu && item.href === "/admin/content-manager") {
                const isActive = isContentManager;
                const Icon = item.icon;
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => setContentManagerOpen((o) => !o)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-400"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.label}
                      {contentManagerOpen ? (
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      ) : (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                    {contentManagerOpen && (
                      <div className="mt-0.5 ml-4 pl-3 border-l border-zinc-800 space-y-0.5">
                        <Link
                          href="/admin/content-manager"
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm ${
                            pathname === "/admin/content-manager"
                              ? "text-indigo-400"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          Overview
                        </Link>
                        {(contentTypes ?? []).map((ct) => {
                          const href = `/admin/content-manager/${ct.pluralId}`;
                          const active = pathname === href || (pathname.startsWith(href + "/") && pathname.length > href.length);
                          return (
                            <Link
                              key={ct.id}
                              href={href}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm truncate ${
                                active ? "text-indigo-400" : "text-zinc-500 hover:text-white"
                              }`}
                              title={ct.name}
                            >
                              {ct.name}
                            </Link>
                          );
                        })}
                        {(!contentTypes || contentTypes.length === 0) && (
                          <p className="px-2.5 py-2 text-xs text-zinc-600">No content types</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
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
