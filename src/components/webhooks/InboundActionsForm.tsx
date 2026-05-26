"use client";

import type { WebhookInboundActions } from "@/lib/webhook-inbound-actions";
import {
  suggestInboundActionForContentType,
  defaultInboundDocumentActions,
  type AttributeHint,
} from "@/lib/webhook-inbound-suggest";
import { BUILTIN_WEBHOOK_HANDLERS } from "@/lib/webhook-handlers/names";

export type ContentTypeOption = {
  pluralId: string;
  name: string;
  attributes: AttributeHint[];
};

export type InboundActionFormState = {
  actionEnabled: boolean;
  actionContentType: string;
  actionDocumentIdPath: string;
  actionSuccessPath: string;
  actionSuccessValue: string;
  actionFieldUpdatesJson: string;
  actionPayloadMappingJson: string;
  actionPublish: boolean;
  actionHandler: string;
};

export const defaultInboundActionForm = (
  contentTypes: ContentTypeOption[] = []
): InboundActionFormState => {
  const ct = contentTypes[0];
  const pluralId = ct?.pluralId ?? "";
  const template = ct
    ? suggestInboundActionForContentType(pluralId, ct.attributes)
    : defaultInboundDocumentActions(pluralId).updateDocument!;

  return formStateFromUpdateConfig(template, "");
};

function formStateFromUpdateConfig(
  template: NonNullable<WebhookInboundActions["updateDocument"]>,
  handler: string
): InboundActionFormState {
  return {
    actionEnabled: true,
    actionContentType: template.contentType,
    actionDocumentIdPath: template.documentIdPath,
    actionSuccessPath: template.successPath ?? "",
    actionSuccessValue: template.successValue != null ? String(template.successValue) : "",
    actionFieldUpdatesJson: JSON.stringify(template.fieldUpdates ?? {}, null, 2),
    actionPayloadMappingJson: JSON.stringify(template.copyFromPayload ?? {}, null, 2),
    actionPublish: !!template.publish,
    actionHandler: handler,
  };
}

export function inboundActionsFromForm(form: InboundActionFormState): WebhookInboundActions | null {
  if (!form.actionEnabled) return null;

  let fieldUpdates: Record<string, unknown> = {};
  let copyFromPayload: Record<string, string> = {};

  try {
    fieldUpdates = JSON.parse(form.actionFieldUpdatesJson || "{}") as Record<string, unknown>;
  } catch {
    throw new Error("Field updates must be valid JSON");
  }

  try {
    const parsed = JSON.parse(form.actionPayloadMappingJson || "{}") as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") copyFromPayload[k] = v;
    }
  } catch {
    throw new Error("Payload mapping must be valid JSON object");
  }

  const updateDocument = {
    enabled: true,
    contentType: form.actionContentType.trim(),
    documentIdPath: form.actionDocumentIdPath.trim(),
    successPath: form.actionSuccessPath.trim() || undefined,
    successValue: form.actionSuccessValue.trim() || undefined,
    fieldUpdates,
    copyFromPayload: Object.keys(copyFromPayload).length > 0 ? copyFromPayload : undefined,
    publish: form.actionPublish,
  };

  if (form.actionHandler.trim()) {
    return {
      handler: form.actionHandler.trim(),
      handlerOptions: { ...updateDocument },
      updateDocument,
    };
  }

  return { updateDocument };
}

export function inboundFormFromActions(
  actions: WebhookInboundActions | null | undefined,
  contentTypes: ContentTypeOption[] = []
): InboundActionFormState {
  const base = defaultInboundActionForm(contentTypes);
  if (!actions?.updateDocument && !actions?.handler) return { ...base, actionEnabled: false };

  const u = actions.updateDocument;
  if (u) {
    return formStateFromUpdateConfig(u, actions.handler ?? "");
  }

  const opts = actions.handlerOptions ?? {};
  return formStateFromUpdateConfig(
    {
      enabled: true,
      contentType: String(opts.contentType ?? contentTypes[0]?.pluralId ?? ""),
      documentIdPath: String(opts.documentIdPath ?? "documentId"),
      successPath: opts.successPath as string | undefined,
      successValue: opts.successValue as string | undefined,
      fieldUpdates: (opts.fieldUpdates as Record<string, unknown>) ?? {},
      copyFromPayload: (opts.copyFromPayload as Record<string, string>) ?? {},
      publish: !!opts.publish,
    },
    actions.handler ?? ""
  );
}

type Props = {
  form: InboundActionFormState;
  onChange: (patch: Partial<InboundActionFormState>) => void;
  onReplace: (next: InboundActionFormState) => void;
  contentTypes: ContentTypeOption[];
};

export function InboundActionsForm({ form, onChange, onReplace, contentTypes }: Props) {
  const selectedType = contentTypes.find((c) => c.pluralId === form.actionContentType);
  const fieldNames = selectedType?.attributes.map((a) => a.name) ?? [];

  function applySchemaSuggestion(pluralId?: string) {
    const ct =
      contentTypes.find((c) => c.pluralId === (pluralId ?? form.actionContentType)) ??
      contentTypes[0];
    if (!ct) return;
    const suggested = suggestInboundActionForContentType(ct.pluralId, ct.attributes);
    onReplace({
      ...formStateFromUpdateConfig(suggested, form.actionHandler),
      actionEnabled: true,
    });
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-medium text-amber-200">On receive — update content</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Works with any content type. Match webhook JSON to your fields, then update the entry.
            Leave &quot;Run only if&quot; empty to always update after secret check.
          </p>
        </div>
        <button
          type="button"
          disabled={!contentTypes.length}
          onClick={() => applySchemaSuggestion()}
          className="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap disabled:opacity-40"
        >
          Suggest from schema
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={form.actionEnabled}
          onChange={(e) => onChange({ actionEnabled: e.target.checked })}
        />
        Enable automatic document update
      </label>

      {form.actionEnabled && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Content type</label>
              <select
                value={form.actionContentType}
                onChange={(e) => {
                  const pluralId = e.target.value;
                  onChange({ actionContentType: pluralId });
                  applySchemaSuggestion(pluralId);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
              >
                {contentTypes.length === 0 && (
                  <option value="">No content types — create one first</option>
                )}
                {contentTypes.map((ct) => (
                  <option key={ct.pluralId} value={ct.pluralId}>
                    {ct.name} ({ct.pluralId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Document ID in payload (dot path)</label>
              <input
                value={form.actionDocumentIdPath}
                onChange={(e) => onChange({ actionDocumentIdPath: e.target.value })}
                placeholder="documentId"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Run only if field (optional)
              </label>
              <input
                list="webhook-field-names"
                value={form.actionSuccessPath}
                onChange={(e) => onChange({ actionSuccessPath: e.target.value })}
                placeholder="status"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm font-mono"
              />
              <datalist id="webhook-field-names">
                {fieldNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Equals value</label>
              <input
                value={form.actionSuccessValue}
                onChange={(e) => onChange({ actionSuccessValue: e.target.value })}
                placeholder="paid"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm font-mono"
              />
            </div>
          </div>

          {fieldNames.length > 0 && (
            <p className="text-xs text-zinc-600">
              Schema fields: {fieldNames.join(", ")}
            </p>
          )}

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Static fields to set on document (JSON)
            </label>
            <textarea
              value={form.actionFieldUpdatesJson}
              onChange={(e) => onChange({ actionFieldUpdatesJson: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Copy from webhook payload (JSON: document field → payload path)
            </label>
            <textarea
              value={form.actionPayloadMappingJson}
              onChange={(e) => onChange({ actionPayloadMappingJson: e.target.value })}
              rows={3}
              placeholder='{ "trackingNumber": "data.tracking.id", "amount": "payment.amount" }'
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white text-xs font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.actionPublish}
              onChange={(e) => onChange({ actionPublish: e.target.checked })}
            />
            Publish entry after update
          </label>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Custom handler (optional)
            </label>
            <input
              list="webhook-handlers"
              value={form.actionHandler}
              onChange={(e) => onChange({ actionHandler: e.target.value })}
              placeholder="document.updateOnMatch"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm font-mono"
            />
            <datalist id="webhook-handlers">
              {BUILTIN_WEBHOOK_HANDLERS.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
            <p className="text-xs text-zinc-600 mt-1">
              Example:{" "}
              <code className="text-zinc-500">
                {`{ "documentId": "…", "status": "paid", "data": { "tracking": "1Z…" } }`}
              </code>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
