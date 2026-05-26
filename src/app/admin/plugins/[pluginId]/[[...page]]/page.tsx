"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetPluginQuery } from "@/store/api/cmsApi";
import { PluginPageHost } from "@/components/plugins/PluginPageHost";

export default function PluginRuntimePage() {
  const params = useParams();
  const pluginId = String(params.pluginId ?? "");
  const pageParts = params.page as string[] | undefined;
  const pageSlug = pageParts?.join("/") ?? "";

  const { data: plugin, isLoading, error } = useGetPluginQuery(pluginId);

  if (isLoading) {
    return <p className="text-zinc-500 py-10">Loading plugin…</p>;
  }

  if (!plugin || error) {
    return (
      <div>
        <Link href="/admin/plugins" className="text-sm text-zinc-500 hover:text-white">
          ← Plugins
        </Link>
        <p className="mt-6 text-red-400">Plugin not found or not installed.</p>
      </div>
    );
  }

  if (!plugin.enabled) {
    return (
      <div>
        <Link href="/admin/plugins" className="text-sm text-zinc-500 hover:text-white">
          ← Plugins
        </Link>
        <p className="mt-6 text-amber-400">This plugin is disabled. Enable it from the Plugins list.</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/plugins" className="text-sm text-zinc-500 hover:text-white">
        ← Plugins
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">{plugin.name}</h1>
      <p className="text-sm text-zinc-500">
        v{plugin.version}
        {plugin.author ? ` · ${plugin.author}` : ""}
      </p>
      <PluginPageHost
        pluginId={plugin.pluginId}
        manifest={plugin.manifest}
        pageSlug={pageSlug}
      />
    </div>
  );
}
