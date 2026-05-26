"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Info, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  PLUGIN_MENU_ICON_LIST,
  filterPluginMenuIcons,
  resolvePluginMenuIcon,
} from "@/lib/plugins/menu-icons";

const ICON_LIST_CAP = 120;

export function PluginsBuildInfoPanel() {
  const [open, setOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);

  const filteredIcons = useMemo(() => filterPluginMenuIcons(iconSearch), [iconSearch]);

  const visibleIcons = useMemo(() => {
    const q = iconSearch.trim();
    if (q) return filteredIcons.slice(0, 500);
    return filteredIcons.slice(0, ICON_LIST_CAP);
  }, [filteredIcons, iconSearch]);

  const hasMore =
    iconSearch.trim() === ""
      ? filteredIcons.length > ICON_LIST_CAP
      : filteredIcons.length > visibleIcons.length;

  async function copyIconName(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedIcon(name);
      toast.success(`Copied "${name}"`);
      setTimeout(() => setCopiedIcon(null), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  function closePanel() {
    setOpen(false);
    setIconSearch("");
    setCopiedIcon(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="How to build a plugin"
        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 text-sm hover:bg-zinc-800 hover:text-white"
        aria-expanded={open}
      >
        <Info className="w-4 h-4 text-indigo-400" />
        Build guide
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close"
            onClick={closePanel}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,36rem)] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl p-4 text-sm text-zinc-400 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
              <h2 className="text-white font-semibold text-base">Build a plugin</h2>
              <button
                type="button"
                onClick={closePanel}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 space-y-4">
              <p>
                Package a folder as ZIP with <code className="text-indigo-300">plugin.json</code>{" "}
                at the root. Max 15&nbsp;MB. See{" "}
                <code className="text-indigo-300">docs/BUILD-A-PLUGIN.md</code> in the repo.
              </p>

              <div>
                <p className="font-medium text-zinc-300 mb-1">ZIP layout</p>
                <pre className="text-xs font-mono text-zinc-500 bg-zinc-950 rounded-lg p-3 overflow-x-auto">{`my-plugin/
  plugin.json
  admin/pages.json
  README.md
  admin/app/     ← Vite build (optional)`}</pre>
              </div>

              <div>
                <p className="font-medium text-zinc-300 mb-1">Examples in repo</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  <li>
                    <code className="text-zinc-500">plugins/demo-suite/</code> — all page types
                  </li>
                  <li>
                    <code className="text-zinc-500">plugins/vite-todo/</code> — React + Vite
                  </li>
                  <li>
                    <code className="text-zinc-500">plugins/mail-sender/</code> — email only
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-zinc-300 mb-1">
                  Sidebar icon names (<code className="text-zinc-500">admin.menu.icon</code>)
                </p>
                <p className="text-xs text-zinc-500 mb-2">
                  Full{" "}
                  <a
                    href="https://lucide.dev/icons"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Lucide
                  </a>{" "}
                  set ({PLUGIN_MENU_ICON_LIST.length} icons). Click a row to copy the name for{" "}
                  <code className="text-zinc-500">plugin.json</code>. Unknown names use{" "}
                  <code className="text-zinc-500">puzzle</code>.
                </p>

                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="search"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder={`Search ${PLUGIN_MENU_ICON_LIST.length} icons (mail, chart, user…)`}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-8 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  {iconSearch && (
                    <button
                      type="button"
                      onClick={() => setIconSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-zinc-600 mb-2">
                  Showing {visibleIcons.length}
                  {hasMore ? ` of ${filteredIcons.length}` : ""} — {PLUGIN_MENU_ICON_LIST.length}{" "}
                  total
                  {!iconSearch.trim() && hasMore ? (
                    <span className="text-zinc-500"> (type in search to browse all)</span>
                  ) : null}
                </p>

                {filteredIcons.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center rounded-lg border border-zinc-800 bg-zinc-950/50">
                    No icons match &quot;{iconSearch}&quot;
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[min(50vh,28rem)] overflow-y-auto pr-1">
                    {visibleIcons.map((item) => {
                      const Icon = resolvePluginMenuIcon(item.name);
                      const copied = copiedIcon === item.name;
                      return (
                        <li key={item.name}>
                          <button
                            type="button"
                            onClick={() => void copyIconName(item.name)}
                            className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 text-left hover:border-indigo-500/40 hover:bg-indigo-950/30 transition-colors group"
                            title={`Copy "${item.name}"`}
                          >
                            <Icon className="w-4 h-4 shrink-0 text-indigo-400" />
                            <span className="min-w-0 flex-1">
                              <code className="text-xs text-indigo-200/90 block">{item.name}</code>
                              <span className="text-[10px] text-zinc-600 block truncate">
                                {item.label}
                              </span>
                            </span>
                            {copied ? (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0 text-zinc-600 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <pre className="text-xs font-mono text-zinc-500 bg-zinc-950 rounded-lg p-3 overflow-x-auto shrink-0">{`"admin": {
  "menu": {
    "label": "My Plugin",
    "icon": "mail",
    "order": 50
  }
}`}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
