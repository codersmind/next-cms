"use client";

import { useState } from "react";
import { BookOpen, Copy, Check, Lock, Globe } from "lucide-react";
import type { ContentType } from "@/store/api/cmsApi";
import {
  buildPublicApiEndpoints,
  buildContentManagerEndpoints,
  QUERY_PARAM_DOCS,
  AUTH_HEADER_EXAMPLE,
  getApiBaseUrl,
} from "@/lib/content-type-api-docs";
import type { ApiEndpointDoc } from "@/lib/content-type-api-docs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80">
        <span className="text-xs text-zinc-500">{label ?? "Example"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 text-xs text-zinc-300 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpointDoc }) {
  const fullPath = endpoint.query
    ? `${endpoint.path}${endpoint.query.startsWith("?") ? endpoint.query : `?${endpoint.query}`}`
    : endpoint.path;

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold border ${METHOD_COLORS[endpoint.method] ?? ""}`}
        >
          {endpoint.method}
        </span>
        <code className="text-sm text-indigo-300 break-all">{fullPath}</code>
        {endpoint.auth === "jwt" ? (
          <span className="inline-flex items-center gap-1 ml-auto text-xs text-amber-400/90">
            <Lock className="w-3 h-3" />
            JWT required
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 ml-auto text-xs text-zinc-500">
            <Globe className="w-3 h-3" />
            Public
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-medium text-white">{endpoint.title}</h4>
        <p className="mt-1 text-sm text-zinc-400">{endpoint.description}</p>
        {endpoint.body && <CodeBlock code={endpoint.body} label="Request body" />}
        {endpoint.response && <CodeBlock code={endpoint.response} label="Response" />}
      </div>
    </article>
  );
}

export function ApiDocsPanel({ contentType }: { contentType: ContentType }) {
  const publicEndpoints = buildPublicApiEndpoints(contentType);
  const adminEndpoints = buildContentManagerEndpoints(contentType);
  const fieldsTable = (contentType.attributes ?? []).filter((a) => !a.private);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-white">{contentType.name}</h2>
            <p className="mt-1 text-sm text-zinc-300">
              {contentType.kind === "collectionType" ? "Collection type" : "Single type"}
              {" · "}
              <span className="text-indigo-300">singular</span>{" "}
              <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{contentType.singularId}</code>
              {contentType.kind === "collectionType" && (
                <>
                  {" · "}
                  <span className="text-indigo-300">plural</span>{" "}
                  <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{contentType.pluralId}</code>
                </>
              )}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Base URL: <code className="text-indigo-300">{getApiBaseUrl()}</code>
              {contentType.draftPublish && (
                <span className="block mt-1">
                  Draft &amp; publish enabled — public API returns only published entries by default (
                  <code className="text-xs">publishedAt</code> set and in the past).
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {fieldsTable.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Fields in API payloads
          </h3>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-zinc-500">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {fieldsTable.map((attr) => (
                  <tr key={attr.name} className="border-b border-zinc-800/80 last:border-0">
                    <td className="px-4 py-2 font-mono text-indigo-300">{attr.name}</td>
                    <td className="px-4 py-2 text-zinc-400">{attr.type}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {[attr.required && "required", attr.unique && "unique"]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Public content API
        </h3>
        <p className="text-sm text-zinc-500 mb-4">
          Use these endpoints from your website or mobile app. No authentication required. Media and
          relations are populated by default (<code className="text-xs">populate=*</code>).
        </p>
        <div className="space-y-4">
          {publicEndpoints.map((ep) => (
            <EndpointCard key={`${ep.method}-${ep.title}`} endpoint={ep} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Content Manager API (admin)
        </h3>
        <p className="text-sm text-zinc-500 mb-2">
          Requires login. Send JWT on every request:
        </p>
        <CodeBlock code={AUTH_HEADER_EXAMPLE} label="Header" />
        <p className="text-sm text-zinc-500 mt-4 mb-4">
          User must have permissions for <code className="text-xs">api::{contentType.pluralId}.{contentType.pluralId}.*</code> actions.
        </p>
        <div className="space-y-4">
          {adminEndpoints.map((ep) => (
            <EndpointCard key={`admin-${ep.method}-${ep.title}`} endpoint={ep} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Common query parameters
        </h3>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-zinc-500">
                <th className="px-4 py-2 font-medium w-48">Parameter</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {QUERY_PARAM_DOCS.map((row) => (
                <tr key={row.name} className="border-b border-zinc-800/80 last:border-0">
                  <td className="px-4 py-2 font-mono text-indigo-300 text-xs">{row.name}</td>
                  <td className="px-4 py-2 text-zinc-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
        <p>
          <strong className="text-zinc-400">Login:</strong>{" "}
          <code className="text-xs">POST {getApiBaseUrl()}/auth/login</code> with{" "}
          <code className="text-xs">{`{ "identifier": "email", "password": "..." }`}</code>
        </p>
        <p className="mt-2">
          <strong className="text-zinc-400">Reserved API IDs</strong> (cannot be used as pluralId): auth,
          upload, content-types, content-manager, users, roles, permissions, media, admin.
        </p>
        <p className="mt-2">
          Full reference: see <code className="text-xs">docs/API.md</code> in the project repository.
        </p>
      </section>
    </div>
  );
}
