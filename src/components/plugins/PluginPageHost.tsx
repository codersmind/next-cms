"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PluginAdminPage, PluginManifest } from "@/lib/plugins/types";
import { PluginAutomationsPanel } from "./PluginAutomationsPanel";
import { PluginHtmlFrame } from "./PluginHtmlFrame";

type Props = {
  pluginId: string;
  manifest: PluginManifest;
  pageSlug: string;
};

async function apiFetch(path: string, init?: RequestInit) {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...init?.headers,
    },
  });
  return res;
}

export function PluginPageHost({ pluginId, manifest, pageSlug }: Props) {
  const page =
    manifest.admin.pages.find((p) => p.slug === pageSlug) ??
    manifest.admin.pages[0];

  if (!page) {
    return <p className="text-zinc-500">No pages defined in plugin manifest.</p>;
  }

  return (
    <div>
      {manifest.automations && manifest.automations.length > 0 && (
        <PluginAutomationsPanel pluginId={pluginId} automations={manifest.automations} />
      )}
      <PluginNav pluginId={pluginId} pages={manifest.admin.pages} current={page.slug} />
      <div className="mt-6">
        <PluginPageRenderer pluginId={pluginId} manifest={manifest} page={page} />
      </div>
    </div>
  );
}

function PluginNav({
  pluginId,
  pages,
  current,
}: {
  pluginId: string;
  pages: PluginAdminPage[];
  current: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
      {pages.map((p) => {
        const href =
          p.slug === ""
            ? `/admin/plugins/${pluginId}`
            : `/admin/plugins/${pluginId}/${p.slug}`;
        const active = p.slug === current;
        return (
          <Link
            key={p.slug || "_root"}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              active
                ? "bg-indigo-600/30 text-indigo-300"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {p.title}
          </Link>
        );
      })}
    </nav>
  );
}

function PluginPageRenderer({
  pluginId,
  manifest,
  page,
}: {
  pluginId: string;
  manifest: PluginManifest;
  page: PluginAdminPage;
}) {
  switch (page.type) {
    case "readme":
      return <ReadmePage pluginId={pluginId} name={manifest.name} />;
    case "settings":
      return (
        <SettingsPage
          pluginId={pluginId}
          settingsKey={page.settingsKey ?? "smtp"}
          schema={manifest.settings?.[page.settingsKey ?? "smtp"]}
        />
      );
    case "collection":
      return (
        <CollectionPage
          pluginId={pluginId}
          collection={page.collection ?? "default"}
          fields={page.fields ?? []}
        />
      );
    case "email-send":
      return <EmailSendPage pluginId={pluginId} />;
    case "html":
      return (
        <PluginHtmlFrame
          title={page.title}
          src={`/api/plugins/${pluginId}/assets/admin/${page.htmlFile ?? "index.html"}`}
        />
      );
    default:
      return <p className="text-zinc-500">Unsupported page type.</p>;
  }
}

function ReadmePage({ pluginId, name }: { pluginId: string; name: string }) {
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch(`/api/plugins/${pluginId}/assets/README.md`);
        if (res.ok) {
          setReadme(await res.text());
        } else {
          setReadme(null);
        }
      } catch {
        setReadme(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [pluginId]);

  if (loading) return <p className="text-zinc-500">Loading documentation…</p>;

  if (readme?.trim()) {
    return (
      <article className="max-w-none text-sm text-zinc-300">
        <pre className="whitespace-pre-wrap font-sans leading-relaxed text-zinc-300">{readme}</pre>
      </article>
    );
  }

  return (
    <div className="prose prose-invert max-w-none text-sm text-zinc-400">
      <h2 className="text-white text-lg font-semibold">{name}</h2>
      <p>
        Plugin <code className="text-indigo-300">{pluginId}</code> is active. Use the tabs above
        to configure and run features.
      </p>
      <p>
        Add a <code className="text-indigo-300">README.md</code> file at the plugin root to show
        documentation here. See <code>docs/BUILD-A-PLUGIN.md</code> in the repository.
      </p>
    </div>
  );
}

function SettingsPage({
  pluginId,
  settingsKey,
  schema,
}: {
  pluginId: string;
  settingsKey: string;
  schema?: { label: string; fields: { name: string; label: string; type: string; required?: boolean; default?: unknown }[] };
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch(
        `/api/plugins/${pluginId}/data?collection=settings`
      );
      const json = await res.json();
      const row = (json.data as { key: string; value: unknown }[])?.find(
        (d) => d.key === settingsKey
      );
      const v = (row?.value as Record<string, string>) ?? {};
      const defaults: Record<string, string> = {};
      for (const f of schema?.fields ?? []) {
        defaults[f.name] = String(v[f.name] ?? f.default ?? "");
      }
      setValues(defaults);
      setLoading(false);
    })();
  }, [pluginId, settingsKey, schema]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch(`/api/plugins/${pluginId}/data`, {
      method: "POST",
      body: JSON.stringify({ collection: "settings", key: settingsKey, value: values }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Settings saved");
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <h2 className="text-lg font-medium text-white">{schema?.label ?? "Settings"}</h2>
      {(schema?.fields ?? []).map((f) => (
        <div key={f.name}>
          <label className="block text-sm text-zinc-400 mb-1">{f.label}</label>
          <input
            type={f.name === "pass" ? "password" : "text"}
            required={!!f.required}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
          />
        </div>
      ))}
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
      >
        Save
      </button>
    </form>
  );
}

function CollectionPage({
  pluginId,
  collection,
  fields,
}: {
  pluginId: string;
  collection: string;
  fields: { name: string; label: string; type: string }[];
}) {
  const [items, setItems] = useState<{ key: string; value: Record<string, string> }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    const res = await apiFetch(`/api/plugins/${pluginId}/data?collection=${collection}`);
    const json = await res.json();
    setItems(
      (json.data as { key: string; value: unknown }[]).map((d) => ({
        key: d.key,
        value: d.value as Record<string, string>,
      }))
    );
  }

  useEffect(() => {
    void load();
  }, [pluginId, collection]);

  function startNew() {
    setEditing("__new__");
    const empty: Record<string, string> = {};
    for (const f of fields) empty[f.name] = "";
    setForm(empty);
  }

  function startEdit(key: string, value: Record<string, string>) {
    setEditing(key);
    setForm({ ...value });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const key =
      editing === "__new__"
        ? form.name?.trim().toLowerCase().replace(/\s+/g, "-") || `item-${Date.now()}`
        : editing!;
    const res = await apiFetch(`/api/plugins/${pluginId}/data`, {
      method: "POST",
      body: JSON.stringify({ collection, key, value: form }),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    toast.success("Saved");
    setEditing(null);
    void load();
  }

  async function remove(key: string) {
    if (!confirm("Delete this item?")) return;
    await apiFetch(
      `/api/plugins/${pluginId}/data?collection=${collection}&key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
    void load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-white">Items</h2>
        <button
          type="button"
          onClick={startNew}
          className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white"
        >
          Add new
        </button>
      </div>
      {editing && (
        <form onSubmit={save} className="mb-6 p-4 rounded-xl border border-zinc-700 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-xs text-zinc-500 mb-1">{f.label}</label>
              {f.type === "richtext" || f.type === "textarea" ? (
                <textarea
                  rows={6}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white text-sm font-mono"
                />
              ) : (
                <input
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white text-sm"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 text-sm text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex justify-between items-center p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
          >
            <span className="text-white">{item.value.name ?? item.key}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(item.key, item.value)}
                className="text-xs text-indigo-400"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="text-xs text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailSendPage({ pluginId }: { pluginId: string }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hello</p>");
  const [templates, setTemplates] = useState<{ key: string; value: Record<string, string> }[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch(`/api/plugins/${pluginId}/data?collection=templates`);
      const json = await res.json();
      setTemplates(
        (json.data as { key: string; value: Record<string, string> }[]).map((d) => ({
          key: d.key,
          value: d.value as Record<string, string>,
        }))
      );
    })();
  }, [pluginId]);

  function applyTemplate(key: string) {
    const t = templates.find((x) => x.key === key);
    if (!t) return;
    setSubject(t.value.subject ?? "");
    setHtml(t.value.body ?? "");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch(`/api/plugins/${pluginId}/send-email`, {
      method: "POST",
      body: JSON.stringify({ to, subject, html }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Send failed");
      return;
    }
    toast.success("Email sent");
  }

  return (
    <form onSubmit={send} className="max-w-xl space-y-4">
      <h2 className="text-lg font-medium text-white">Send email</h2>
      {templates.length > 0 && (
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Load template</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
            onChange={(e) => e.target.value && applyTemplate(e.target.value)}
            defaultValue=""
          >
            <option value="">— Select —</option>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.value.name ?? t.key}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm text-zinc-400 mb-1">To</label>
        <input
          type="email"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Subject</label>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">HTML body</label>
        <textarea
          rows={10}
          required
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white text-sm font-mono"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
      >
        Send
      </button>
    </form>
  );
}
