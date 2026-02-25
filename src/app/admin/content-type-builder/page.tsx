"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Layout, FileStack, LayoutTemplate, FolderOpen, Boxes, Puzzle } from "lucide-react";
import {
  useGetContentTypesQuery,
  useGetTemplatesQuery,
  useGetComponentsQuery,
  useCreateContentTypeMutation,
  type ContentType,
  type ContentTypeTemplate,
  type ContentTypeAttribute,
  type Component,
} from "@/store/api/cmsApi";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function ContentTypeBuilderPage() {
  const { data: contentTypes, isLoading } = useGetContentTypesQuery();
  const { data: templates } = useGetTemplatesQuery();
  const [createContentType, { isLoading: creating }] = useCreateContentTypeMutation();
  const [fromTemplateId, setFromTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const collectionTypes = (contentTypes ?? []).filter((t) => t.kind === "collectionType");
  const singleTypes = (contentTypes ?? []).filter((t) => t.kind === "singleType");
  const { data: components } = useGetComponentsQuery();

  async function handleCreateFromTemplate(t: ContentTypeTemplate) {
    setError(null);
    setFromTemplateId(t.id);
    const schema = typeof t.schema === "string" ? JSON.parse(t.schema) : t.schema;
    const name = schema.displayName ?? t.name;
    const singularId = schema.singularName ?? slugFromName(name);
    const pluralId = schema.pluralName ?? singularId + "s";
    const attributes = (schema.attributes ?? []) as ContentTypeAttribute[];
    try {
      await createContentType({
        name,
        singularId,
        pluralId,
        kind: (schema.kind === "singleType" ? "singleType" : "collectionType") as "collectionType" | "singleType",
        draftPublish: !!schema.draftPublish,
        attributes,
      }).unwrap();
      setFromTemplateId(null);
    } catch (e: unknown) {
      setError((e as { data?: { error?: string } })?.data?.error ?? "Failed to create");
      setFromTemplateId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-500">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Boxes className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Content-Type Builder</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Create and manage collection types, single types, and components.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content-type-builder/new?kind=collectionType"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create collection type
          </Link>
          <Link
            href="/admin/content-type-builder/new?kind=singleType"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-700 text-white text-sm font-medium hover:bg-zinc-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create single type
          </Link>
          <Link
            href="/admin/content-type-builder/components/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Puzzle className="w-4 h-4" />
            Create component
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Layout className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Collection types
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Content types that can have multiple entries (e.g. Articles, Products).
            </p>
          </div>
          <div className="p-6">
            {collectionTypes.length === 0 ? (
              <p className="text-zinc-500 text-sm">No collection types yet. Create one above or use a template below.</p>
            ) : (
              <ul className="space-y-2">
                {collectionTypes.map((ct) => (
                  <ContentTypeRow key={ct.id} ct={ct} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <FileStack className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Single types
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Content types with only one entry (e.g. Homepage, Global settings).
            </p>
          </div>
          <div className="p-6">
            {singleTypes.length === 0 ? (
              <p className="text-zinc-500 text-sm">No single types yet.</p>
            ) : (
              <ul className="space-y-2">
                {singleTypes.map((ct) => (
                  <ContentTypeRow key={ct.id} ct={ct} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Components
              </h2>
            </div>
            <Link
              href="/admin/content-type-builder/components/new"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Create new component
            </Link>
          </div>
          <p className="px-6 pt-2 text-sm text-zinc-500">
            Reusable field groups you can add to content types (e.g. SEO, Hero block).
          </p>
          <div className="p-6">
            {components && components.length > 0 ? (
              <ul className="space-y-2">
                {components.map((comp) => (
                  <li key={comp.id}>
                    <Link
                      href={`/admin/content-type-builder/components/${comp.id}`}
                      className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-white">
                        <Puzzle className="w-4 h-4 text-zinc-500" />
                        {comp.name}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {comp.category} · {(comp.attributes ?? []).length} fields
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500 text-sm">No components yet. Create one to reuse fields across content types.</p>
            )}
          </div>
        </section>

        {templates && templates.length > 0 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Create from template
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                One-click content types with pre-defined fields.
              </p>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleCreateFromTemplate(t)}
                    disabled={creating && fromTemplateId === t.id}
                    className="text-left p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-colors disabled:opacity-50 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                    <span className="font-medium text-white">{t.name}</span>
                    <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                      {t.description ?? "No description"}
                    </p>
                    {creating && fromTemplateId === t.id ? (
                      <span className="mt-2 inline-block text-xs text-indigo-400">Creating…</span>
                    ) : (
                      <span className="mt-2 inline-block text-xs text-indigo-400">Create content type →</span>
                    )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ContentTypeRow({ ct }: { ct: ContentType }) {
  return (
    <li>
      <Link
        href={`/admin/content-type-builder/${ct.id}`}
        className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-white">
          <Layout className="w-4 h-4 text-zinc-500" />
          {ct.name}
        </span>
        <span className="text-sm text-zinc-500">
          {ct.kind === "collectionType" ? ct.pluralId : ct.singularId}
          {" · "}
          {ct.attributes?.length ?? 0} fields
        </span>
      </Link>
    </li>
  );
}
