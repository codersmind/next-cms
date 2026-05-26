"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronDown } from "lucide-react";
import { useGetContentTypesQuery } from "@/store/api/cmsApi";
import { ApiDocsPanel } from "@/components/content-type-builder/ApiDocsPanel";

function ApiDocsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const { data: contentTypes, isLoading } = useGetContentTypesQuery();

  const selected = useMemo(() => {
    if (!contentTypes?.length) return null;
    const match = idFromUrl ? contentTypes.find((ct) => ct.id === idFromUrl) : null;
    return match ?? contentTypes[0];
  }, [contentTypes, idFromUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">Loading…</div>
    );
  }

  if (!contentTypes?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">No content types yet.</p>
        <Link
          href="/admin/content-type-builder/new?kind=collectionType"
          className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          Create a content type →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/content-type-builder"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Content-Type Builder
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">API documentation</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Endpoints and examples for your content types — use in front-end apps or integrations.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label htmlFor="api-docs-ct" className="text-xs text-zinc-500 uppercase tracking-wider">
              Content type
            </label>
            <div className="relative">
              <select
                id="api-docs-ct"
                value={selected?.id ?? ""}
                onChange={(e) =>
                  router.replace(
                    `/admin/content-type-builder/api-docs?id=${encodeURIComponent(e.target.value)}`
                  )
                }
                className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {contentTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} ({ct.pluralId})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {selected && <ApiDocsPanel key={selected.id} contentType={selected} />}
    </div>
  );
}

export default function ContentTypeApiDocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-zinc-500">Loading…</div>
      }
    >
      <ApiDocsContent />
    </Suspense>
  );
}
