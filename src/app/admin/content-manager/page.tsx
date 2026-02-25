"use client";

import { useGetContentTypesQuery } from "@/store/api/cmsApi";
import Link from "next/link";
import { FileText, Layout } from "lucide-react";

export default function ContentManagerPage() {
  const { data: contentTypes, isLoading } = useGetContentTypesQuery();
  const collectionTypes = (contentTypes ?? []).filter((t) => t.kind === "collectionType");
  const singleTypes = (contentTypes ?? []).filter((t) => t.kind === "singleType");

  if (isLoading) {
    return (
      <div className="py-12 text-center text-zinc-500">Loading…</div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <FileText className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Content Manager</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Select a content type to list and edit entries.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <ul className="divide-y divide-zinc-800">
          {collectionTypes.map((ct) => (
            <li key={ct.id}>
              <Link
                href={`/admin/content-manager/${ct.pluralId}`}
                className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-white">
                  <Layout className="w-4 h-4 text-zinc-500" />
                  {ct.name}
                </span>
                <span className="text-sm text-zinc-500">{ct.pluralId}</span>
              </Link>
            </li>
          ))}
          {singleTypes.map((ct) => (
            <li key={ct.id}>
              <Link
                href={`/admin/content-manager/${ct.pluralId}`}
                className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-white">
                  <Layout className="w-4 h-4 text-zinc-500" />
                  {ct.name}
                  <span className="text-xs text-zinc-500 font-normal">(single)</span>
                </span>
                <span className="text-sm text-zinc-500">{ct.pluralId}</span>
              </Link>
            </li>
          ))}
        </ul>
        {collectionTypes.length === 0 && singleTypes.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500 text-sm">
            No content types yet. Create one in Content-Type Builder.
          </div>
        )}
      </div>
    </div>
  );
}
