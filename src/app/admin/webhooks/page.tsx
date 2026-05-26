"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Pencil,
  Send,
  Copy,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useGetWebhookDeliveriesQuery,
  useGetContentTypesQuery,
  type WebhookConfig,
} from "@/store/api/cmsApi";
import { WEBHOOK_EVENTS } from "@/lib/webhook-events";
import type { WebhookInboundActions } from "@/lib/webhook-inbound-actions";
import {
  InboundActionsForm,
  defaultInboundActionForm,
  inboundActionsFromForm,
  inboundFormFromActions,
  type InboundActionFormState,
  type ContentTypeOption,
} from "@/components/webhooks/InboundActionsForm";

const DEFAULT_OUTBOUND_EVENTS = ["entry.create", "entry.update", "entry.publish"];

type FormState = {
  name: string;
  direction: "outbound" | "inbound";
  url: string;
  enabled: boolean;
  events: string[];
  contentTypes: string[];
  generateSecret: boolean;
} & InboundActionFormState;

const emptyForm = (): FormState => ({
  name: "",
  direction: "outbound",
  url: "",
  enabled: true,
  events: [...DEFAULT_OUTBOUND_EVENTS],
  contentTypes: [],
  generateSecret: true,
  ...defaultInboundActionForm(),
  actionEnabled: false,
});

function CopyText({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label ?? "Copy URL"}
    </button>
  );
}

function DeliveriesPanel({ webhookId }: { webhookId: string }) {
  const { data: deliveries, isLoading } = useGetWebhookDeliveriesQuery({ id: webhookId, limit: 15 });

  if (isLoading) return <p className="text-sm text-zinc-500 p-4">Loading deliveries…</p>;
  if (!deliveries?.length) {
    return <p className="text-sm text-zinc-500 p-4">No deliveries yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-800 max-h-64 overflow-y-auto">
      {deliveries.map((d) => (
        <li key={d.id} className="px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                d.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {d.success ? "OK" : "Failed"}
            </span>
            <span className="text-zinc-400">{d.event}</span>
            {d.statusCode != null && (
              <span className="text-zinc-500">HTTP {d.statusCode}</span>
            )}
            {d.durationMs != null && (
              <span className="text-zinc-600">{d.durationMs}ms</span>
            )}
            <span className="text-zinc-600 ml-auto text-xs">
              {new Date(d.createdAt).toLocaleString()}
            </span>
          </div>
          {d.error && <p className="mt-1 text-red-400/90 text-xs">{d.error}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function AdminWebhooksPage() {
  const { data: webhooks, isLoading } = useGetWebhooksQuery();
  const { data: contentTypes } = useGetContentTypesQuery();
  const [createWebhook] = useCreateWebhookMutation();
  const [updateWebhook] = useUpdateWebhookMutation();
  const [deleteWebhook] = useDeleteWebhookMutation();
  const [testWebhook] = useTestWebhookMutation();

  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const receiveBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/webhooks/receive`;
  }, []);

  const contentTypeOptions: ContentTypeOption[] = useMemo(
    () =>
      (contentTypes ?? []).map((ct) => ({
        pluralId: ct.pluralId,
        name: ct.name,
        attributes: (ct.attributes ?? []).map((a) => ({
          name: a.name,
          type: a.type,
          enum: Array.isArray(a.enum) ? (a.enum as string[]) : undefined,
        })),
      })),
    [contentTypes]
  );

  const openCreate = (direction: "outbound" | "inbound") => {
    setForm({
      ...emptyForm(),
      ...defaultInboundActionForm(contentTypeOptions),
      direction,
      generateSecret: true,
      ...(direction === "inbound" ? { actionEnabled: true } : { actionEnabled: false }),
    });
    setRevealedSecret(null);
    setEditingId(null);
    setModal("create");
  };

  const openEdit = (w: WebhookConfig) => {
    const inboundFields =
      w.direction === "inbound"
        ? inboundFormFromActions(w.actions as WebhookInboundActions | null, contentTypeOptions)
        : { ...defaultInboundActionForm(contentTypeOptions), actionEnabled: false };
    setForm({
      name: w.name,
      direction: w.direction,
      url: w.url ?? "",
      enabled: w.enabled,
      events: w.events.length ? w.events : [...DEFAULT_OUTBOUND_EVENTS],
      contentTypes: w.contentTypes ?? [],
      generateSecret: false,
      ...inboundFields,
    });
    setRevealedSecret(null);
    setEditingId(w.id);
    setModal("edit");
  };

  const closeModal = () => {
    setModal("none");
    setEditingId(null);
    setRevealedSecret(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name required.");
      return;
    }
    if (form.direction === "outbound" && !form.url.trim()) {
      toast.error("URL required for outbound webhooks.");
      return;
    }
    let actions: WebhookInboundActions | null = null;
    if (form.direction === "inbound") {
      try {
        actions = inboundActionsFromForm(form);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Invalid action config");
        return;
      }
    }
    try {
      const result = await createWebhook({
        name: form.name.trim(),
        direction: form.direction,
        url: form.direction === "outbound" ? form.url.trim() : undefined,
        generateSecret: form.generateSecret,
        enabled: form.enabled,
        events: form.direction === "outbound" ? form.events : [],
        contentTypes: form.contentTypes,
        actions,
      }).unwrap();
      if (result.secret) setRevealedSecret(result.secret);
      toast.success("Webhook created.");
      if (!result.secret) closeModal();
    } catch (err: unknown) {
      toast.error(readError(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.name.trim()) return;
    let actions: WebhookInboundActions | null = null;
    if (form.direction === "inbound") {
      try {
        actions = inboundActionsFromForm(form);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Invalid action config");
        return;
      }
    }
    try {
      await updateWebhook({
        id: editingId,
        name: form.name.trim(),
        url: form.direction === "outbound" ? form.url.trim() : undefined,
        enabled: form.enabled,
        events: form.events,
        contentTypes: form.contentTypes,
        actions: form.direction === "inbound" ? actions : undefined,
      }).unwrap();
      toast.success("Webhook updated.");
      closeModal();
    } catch (err: unknown) {
      toast.error(readError(err));
    }
  };

  const handleDelete = async (w: WebhookConfig) => {
    if (!confirm(`Delete webhook "${w.name}"?`)) return;
    try {
      await deleteWebhook(w.id).unwrap();
      toast.success("Webhook deleted.");
    } catch (err: unknown) {
      toast.error(readError(err));
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook(id).unwrap();
      if (result.success) toast.success(`Test sent (HTTP ${result.statusCode ?? "ok"}).`);
      else toast.error(result.error ?? "Test delivery failed.");
    } catch (err: unknown) {
      toast.error(readError(err));
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    try {
      const result = await updateWebhook({ id, regenerateSecret: true }).unwrap();
      if (result.secret) {
        setRevealedSecret(result.secret);
        toast.success("New secret generated — copy it now.");
      }
    } catch (err: unknown) {
      toast.error(readError(err));
    }
  };

  const outboundEvents = WEBHOOK_EVENTS.filter((e) =>
    e.directions.includes("outbound")
  );

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">
        ← Dashboard
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Webhook className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Webhooks</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Send events to third-party URLs or receive callbacks from any external service.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openCreate("inbound")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-800"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Add inbound
          </button>
          <button
            type="button"
            onClick={() => openCreate("outbound")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
          >
            <Plus className="w-4 h-4" />
            Add outbound
          </button>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400 space-y-2">
        <p>
          <strong className="text-zinc-300">Outbound</strong> — CMS sends HTTP POST when content is
          created, updated, published, or deleted. Verify with header{" "}
          <code className="text-xs bg-zinc-800 px-1 rounded">X-Webhook-Signature: sha256=…</code> (HMAC
          of the raw body).
        </p>
        <p>
          <strong className="text-zinc-300">Inbound</strong> — External services (e.g. Stripe, PayPal)
          POST to your receive URL. Configure <strong className="text-zinc-300">On receive — update content</strong> to
          verify the payload (optional), then update any content type entry — orders, bookings, subscriptions, etc.
        </p>
      </section>

      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : !webhooks?.length ? (
        <p className="text-zinc-500 text-sm">No webhooks configured yet.</p>
      ) : (
        <ul className="space-y-3">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              <div className="flex flex-wrap items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  {w.direction === "inbound" ? (
                    <ArrowDownToLine className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ArrowUpFromLine className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{w.name}</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500">
                      {w.direction}
                    </span>
                    {!w.enabled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  {w.direction === "outbound" && w.url && (
                    <p className="mt-1 text-sm text-zinc-400 truncate font-mono">{w.url}</p>
                  )}
                  {w.direction === "inbound" && receiveBaseUrl && (
                    <p className="mt-1 text-sm text-indigo-300/90 font-mono break-all">
                      {receiveBaseUrl}/{w.id}
                      <span className="ml-2">
                        <CopyText text={`${receiveBaseUrl}/${w.id}`} />
                      </span>
                    </p>
                  )}
                  {w.direction === "outbound" && w.events.length > 0 && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Events: {w.events.join(", ")}
                      {w.contentTypes.length > 0 && ` · Types: ${w.contentTypes.join(", ")}`}
                    </p>
                  )}
                  {w.direction === "inbound" && !!w.actions && (
                    <p className="mt-2 text-xs text-amber-400/90">
                      Action: updates{" "}
                      <code className="bg-zinc-800 px-1 rounded">
                        {(w.actions as WebhookInboundActions).updateDocument?.contentType ??
                          "—"}
                      </code>
                      {(w.actions as WebhookInboundActions).updateDocument?.successPath ? (
                        <>
                          {" "}
                          when{" "}
                          <code className="bg-zinc-800 px-1 rounded">
                            {(w.actions as WebhookInboundActions).updateDocument?.successPath}=
                            {(w.actions as WebhookInboundActions).updateDocument?.successValue}
                          </code>
                        </>
                      ) : null}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-600">
                    {w.deliveriesCount ?? 0} deliveries · {w.hasSecret ? "Secret set" : "No secret"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.direction === "outbound" && (
                    <button
                      type="button"
                      onClick={() => handleTest(w.id)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Send test"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                    title="Delivery log"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(w)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(w)}
                    className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expandedId === w.id && (
                <div className="border-t border-zinc-800 bg-zinc-950/50">
                  <DeliveriesPanel webhookId={w.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-white">
              {modal === "create" ? "Create webhook" : "Edit webhook"}
            </h2>
            {revealedSecret && (
              <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-200 font-medium">Save this secret — it won’t be shown again</p>
                <code className="mt-2 block text-xs text-amber-100 break-all font-mono">{revealedSecret}</code>
                <div className="mt-2">
                  <CopyText text={revealedSecret} label="Copy secret" />
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Done
                </button>
              </div>
            )}
            {!revealedSecret && (
              <form
                className="mt-4 space-y-4"
                onSubmit={modal === "create" ? handleCreate : handleUpdate}
              >
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
                    placeholder="Order shipped notifier"
                  />
                </div>
                {form.direction === "outbound" && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Target URL</label>
                    <input
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm font-mono"
                      placeholder="https://api.example.com/webhooks/cms"
                    />
                  </div>
                )}
                {form.direction === "outbound" && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Events</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {outboundEvents.map((ev) => (
                        <label key={ev.value} className="flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={form.events.includes(ev.value)}
                            onChange={(e) => {
                              setForm((f) => ({
                                ...f,
                                events: e.target.checked
                                  ? [...f.events, ev.value]
                                  : f.events.filter((x) => x !== ev.value),
                              }));
                            }}
                            className="rounded border-zinc-600"
                          />
                          {ev.label}
                          <span className="text-zinc-600 text-xs">({ev.value})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {form.direction === "inbound" && (
                  <InboundActionsForm
                    form={form}
                    onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                    onReplace={(next) => setForm((f) => ({ ...f, ...next }))}
                    contentTypes={contentTypeOptions}
                  />
                )}
                {form.direction === "outbound" && contentTypes && contentTypes.length > 0 && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      Content types (empty = all)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {contentTypes.map((ct) => (
                        <label
                          key={ct.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            checked={form.contentTypes.includes(ct.pluralId)}
                            onChange={(e) => {
                              setForm((f) => ({
                                ...f,
                                contentTypes: e.target.checked
                                  ? [...f.contentTypes, ct.pluralId]
                                  : f.contentTypes.filter((p) => p !== ct.pluralId),
                              }));
                            }}
                          />
                          {ct.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  Enabled
                </label>
                {modal === "create" && (
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={form.generateSecret}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, generateSecret: e.target.checked }))
                      }
                    />
                    Generate signing secret
                  </label>
                )}
                {modal === "edit" && editingId && (
                  <button
                    type="button"
                    onClick={() => handleRegenerateSecret(editingId)}
                    className="text-sm text-amber-400 hover:text-amber-300"
                  >
                    Regenerate secret
                  </button>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
                  >
                    {modal === "create" ? "Create" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function readError(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return "Request failed.";
}
