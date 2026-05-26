"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Puzzle, Upload, Trash2, Power, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetPluginsQuery,
  useUploadPluginMutation,
  useUpdatePluginMutation,
  useDeletePluginMutation,
} from "@/store/api/cmsApi";
import { PluginsBuildInfoPanel } from "@/components/plugins/PluginsBuildInfoPanel";

export default function PluginsAdminPage() {
  const { data: plugins, isLoading } = useGetPluginsQuery();
  const [uploadPlugin, { isLoading: uploading }] = useUploadPluginMutation();
  const [updatePlugin] = useUpdatePluginMutation();
  const [deletePlugin] = useDeletePluginMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await uploadPlugin(form).unwrap();
      toast.success(`Installed ${result.pluginId}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { error?: string } }).data?.error ?? "Upload failed")
          : "Upload failed";
      toast.error(msg);
    }
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">
        ← Dashboard
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Puzzle className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Plugins</h1>
            <p className="text-sm text-zinc-500">
              Upload ZIP packages to extend the admin (email, integrations, custom pages).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PluginsBuildInfoPanel />
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Installing…" : "Upload plugin ZIP"}
          </button>
        </div>
      </div>
      
      {process.env.NODE_ENV === "development" && (
      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <p className="font-medium text-zinc-300 mb-2">ZIP structure</p>
        <pre className="text-xs font-mono text-zinc-500 overflow-x-auto">{`my-plugin/
  plugin.json       ← required manifest
  admin/pages.json  ← admin UI pages
  README.md         ← optional
  admin/index.html  ← optional (type: html)`}</pre>
        <p className="mt-3">
          Full guide for plugin authors:{" "}
          <code className="text-indigo-300">docs/BUILD-A-PLUGIN.md</code>
          {" "}(overview: <code className="text-indigo-300">docs/PLUGINS.md</code>).
          Full example: <code className="text-indigo-300">plugins/demo-suite/</code>
          {" · "}
          Vite TODO: <code className="text-indigo-300">plugins/vite-todo/</code>
          {" · "}
          Email: <code className="text-indigo-300">plugins/mail-sender/</code>
        </p>
      </section>
      )}
      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : !plugins?.length ? (
        <p className="text-zinc-500">No plugins installed. Upload a ZIP or add folders under /plugins.</p>
      ) : (
        <ul className="space-y-3">
          {plugins.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
            >
              <div>
                <span className="font-medium text-white">{p.name}</span>
                <span className="ml-2 text-xs text-zinc-500">v{p.version}</span>
                {!p.enabled && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                    Disabled
                  </span>
                )}
                <p className="text-sm text-zinc-500 mt-1">{p.description}</p>
                <p className="text-xs text-zinc-600 mt-1 font-mono">{p.pluginId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/plugins/${p.pluginId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </Link>
                <button
                  type="button"
                  title={p.enabled ? "Disable" : "Enable"}
                  onClick={async () => {
                    try {
                      await updatePlugin({ pluginId: p.pluginId, enabled: !p.enabled }).unwrap();
                      toast.success(p.enabled ? "Disabled" : "Enabled");
                    } catch {
                      toast.error("Failed");
                    }
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800"
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Uninstall ${p.name}?`)) return;
                    try {
                      await deletePlugin(p.pluginId).unwrap();
                      toast.success("Uninstalled");
                    } catch {
                      toast.error("Failed");
                    }
                  }}
                  className="p-2 rounded-lg text-red-400/80 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
