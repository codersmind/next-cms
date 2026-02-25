"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  useGetContentTypesQuery,
  useGetDocumentQuery,
  useGetDocumentsQuery,
  useGetComponentsQuery,
  useUpdateDocumentMutation,
  type ContentTypeAttribute,
} from "@/store/api/cmsApi";
import { FormField, FormikSwitch } from "@/components/forms";
import { FormikRichText } from "@/components/editor/FormikRichText";
import { ComponentField, getDefaultComponentValue, DynamicZoneField } from "@/components/ComponentField";
import { MediaPicker } from "@/components/MediaPicker";
import { Field } from "formik";

function componentUid(category: string, name: string): string {
  return `${category}.${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

function slugify(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    || "";
}

export default function EditDocumentPage() {
  const params = useParams();
  const pluralId = params.pluralId as string;
  const documentId = params.documentId as string;
  const router = useRouter();
  const { data: contentTypes } = useGetContentTypesQuery();
  const { data: components } = useGetComponentsQuery();
  const contentType = contentTypes?.find((t) => t.pluralId === pluralId);
  const { data: docResponse, isLoading } = useGetDocumentQuery(
    { contentType: pluralId, documentId },
    { skip: !pluralId || !documentId }
  );
  const [updateDocument, { isLoading: saving, error }] = useUpdateDocumentMutation();

  const doc = docResponse?.data as Record<string, unknown> | undefined;

  if (!contentType) {
    return (
      <div className="py-12">
        <p className="text-zinc-500">Content type not found.</p>
        <Link href="/admin/content-manager" className="mt-4 inline-block text-indigo-400 hover:underline">
          ← Back to Content Manager
        </Link>
      </div>
    );
  }

  if (isLoading || !doc) {
    return (
      <div className="py-12 text-center text-zinc-500">
        {!doc && !isLoading ? "Document not found." : "Loading…"}
      </div>
    );
  }

  const attributes = (contentType.attributes ?? []) as ContentTypeAttribute[];
  const initialValues: Record<string, unknown> = {};
  const shape: Record<string, Yup.AnySchema> = {};
  const docPublishedAt = doc.publishedAt as string | null | undefined;
  initialValues.published = !!docPublishedAt;
  initialValues.publishedAt = docPublishedAt
    ? new Date(docPublishedAt).toISOString().slice(0, 16)
    : "";
  shape.published = Yup.boolean();
  shape.publishedAt = Yup.string();
  for (const attr of attributes) {
    const existing = doc[attr.name];
    const hasValue = existing !== undefined && existing !== null;
    switch (attr.type) {
      case "text":
      case "email":
      case "uid":
        initialValues[attr.name] = hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required(`${attr.name} is required`) : Yup.string();
        break;
      case "richtext":
      case "richtext-markdown":
        initialValues[attr.name] =
          typeof existing === "string" ? existing : Array.isArray(existing) ? "" : hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required(`${attr.name} is required`) : Yup.string();
        break;
      case "number":
        initialValues[attr.name] = hasValue ? (typeof existing === "number" ? existing : Number(existing) || "") : "";
        shape[attr.name] = attr.required ? Yup.number().required() : Yup.number().nullable();
        break;
      case "boolean":
        initialValues[attr.name] = hasValue ? !!existing : false;
        shape[attr.name] = Yup.boolean();
        break;
      case "date":
        initialValues[attr.name] = hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        break;
      case "json":
        initialValues[attr.name] =
          typeof existing === "string" ? existing : JSON.stringify(existing ?? {}, null, 2);
        shape[attr.name] = Yup.string();
        break;
      case "relation": {
        const multi = ["oneToMany", "manyToMany", "manyWay"].includes(String(attr.relation));
        if (multi) {
          const arr = Array.isArray(existing) ? existing : [];
          initialValues[attr.name] = arr.map((x: { documentId?: string } | string) =>
            typeof x === "object" && x?.documentId ? x.documentId : String(x)
          );
          shape[attr.name] = attr.required ? Yup.array().min(1) : Yup.array();
        } else {
          const one =
            existing && typeof existing === "object" && "documentId" in existing
              ? (existing as { documentId: string }).documentId
              : existing;
          initialValues[attr.name] = one != null ? String(one) : "";
          shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        }
        break;
      }
      case "media":
        initialValues[attr.name] =
          typeof existing === "object" && existing && "id" in existing
            ? (existing as { id: string }).id
            : hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        break;
      case "enumeration":
        initialValues[attr.name] = hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        break;
      case "component": {
        const comp = components?.find((c) => componentUid(c.category, c.name) === attr.component);
        const compAttrs = (comp?.attributes ?? []) as ContentTypeAttribute[];
        const defaultObj = getDefaultComponentValue(compAttrs);
        if (attr.repeatable) {
          const arr = Array.isArray(existing) ? existing : [];
          initialValues[attr.name] = arr.length
            ? arr.map((item: Record<string, unknown>) => ({ ...defaultObj, ...item }))
            : [defaultObj];
        } else {
          const obj = existing && typeof existing === "object" && !Array.isArray(existing) ? (existing as Record<string, unknown>) : null;
          initialValues[attr.name] = obj ? { ...defaultObj, ...obj } : defaultObj;
        }
        break;
      }
      case "dynamiczone":
        initialValues[attr.name] = existing ?? [];
        break;
      default:
        initialValues[attr.name] = hasValue && typeof existing === "string" ? existing : hasValue ? String(existing) : "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
    }
  }
  const schema = Yup.object(shape);

  async function onSubmit(values: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    const isPublished = !!values.published;
    const publishedAtRaw = values.publishedAt;
    const publishedAt = !isPublished
      ? null
      : typeof publishedAtRaw === "string" && publishedAtRaw.trim() !== ""
        ? publishedAtRaw.trim()
        : new Date().toISOString().slice(0, 16);
    for (const attr of attributes) {
      const v = values[attr.name];
      if (attr.type === "relation") {
        data[attr.name] = v;
        continue;
      }
      if (attr.type === "number") {
        data[attr.name] = v === "" || v === undefined ? null : Number(v);
        continue;
      }
      if (attr.type === "json") {
        if (typeof v === "string") {
          try {
            data[attr.name] = v.trim() ? JSON.parse(v) : {};
          } catch {
            data[attr.name] = {};
          }
        } else {
          data[attr.name] = v ?? {};
        }
        continue;
      }
      if (attr.type === "component" || attr.type === "dynamiczone") {
        data[attr.name] = v ?? (attr.type === "component" && attr.repeatable ? [] : []);
        continue;
      }
      if (attr.type === "media") {
        data[attr.name] = v === "" ? null : v;
        continue;
      }
      data[attr.name] = v === undefined ? "" : v;
    }
    try {
      await updateDocument({ contentType: pluralId, documentId, data, publishedAt }).unwrap();
      router.push(`/admin/content-manager/${pluralId}`);
    } catch {
      // error
    }
  }

  return (
    <div>
      <Link
        href={`/admin/content-manager/${pluralId}`}
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← Back to {contentType.name}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">
        Edit {contentType.name} entry
      </h1>
      <p className="mt-0.5 text-sm text-zinc-500 font-mono">{documentId}</p>

      {error && "data" in error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {(error as { data?: { error?: string } }).data?.error ?? "Failed to update"}
        </div>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={Object.keys(shape).length ? schema : undefined}
        onSubmit={onSubmit}
      >
        {({ values, setFieldValue }) => {
          const slugTarget = attributes.find((a) => a.type === "uid" || a.name === "slug");
          const slugSource = attributes.find(
            (a) => (a.name === "title" || a.name === "name") && (a.type === "text" || a.type === "richtext" || a.type === "richtext-markdown")
          );
          useEffect(() => {
            if (slugTarget && slugSource && values[slugSource.name] != null) {
              setFieldValue(slugTarget.name, slugify(String(values[slugSource.name] ?? "")));
            }
          }, [slugTarget?.name, slugSource?.name, values[slugSource?.name ?? ""], setFieldValue]);
          return (
        <Form className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              {attributes.map((attr) => (
                <FieldByType key={attr.name} attr={attr} contentTypes={contentTypes ?? []} components={components ?? []} />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <Link
                href={`/admin/content-manager/${pluralId}`}
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </Link>
            </div>
          </div>
          <div className="shrink-0 w-full lg:w-72 lg:sticky lg:top-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400">Publication</h3>
              <FormikSwitch name="published" label="Published" />
              {values.published ? (
                <>
                  <FormField
                    name="publishedAt"
                    label="Published at (optional)"
                    type="datetime-local"
                  />
                  <p className="text-xs text-zinc-500">
                    Leave default for now, or set a future date to schedule.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Form>
          );
        }}
      </Formik>
    </div>
  );
}

function RelationField({
  attr,
  contentTypes,
}: {
  attr: ContentTypeAttribute;
  contentTypes: { singularId: string; pluralId: string; name: string }[];
}) {
  const targetSingular = String(attr.target || "");
  const targetCt = contentTypes.find((c) => c.singularId === targetSingular);
  const targetPlural = targetCt?.pluralId ?? "";
  const { data: docsData } = useGetDocumentsQuery(
    { contentType: targetPlural },
    { skip: !targetPlural }
  );
  const documents = (docsData?.data ?? []) as { documentId: string; [k: string]: unknown }[];
  const titleKey = documents[0] ? (Object.keys(documents[0]).find((k) => k === "title" || k === "name") ?? "documentId") : "documentId";
  const multi = ["oneToMany", "manyToMany", "manyWay"].includes(String(attr.relation));

  if (!targetPlural) {
    return (
      <div>
        <label className="block mb-1 text-sm text-zinc-400">{attr.name}</label>
        <p className="text-xs text-zinc-500">Select a target content type in Content-Type Builder.</p>
      </div>
    );
  }

  const labelClass = "block mb-1 text-sm text-zinc-400";
  const inputClass = "w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  if (multi) {
    return (
      <div>
        <label className={labelClass}>{attr.name} (relation)</label>
        <Field as="select" name={attr.name} multiple className={inputClass + " min-h-[80px]"}>
          <option value="">—</option>
          {documents.map((doc) => (
            <option key={doc.documentId} value={doc.documentId}>
              {String(doc[titleKey] ?? doc.documentId)}
            </option>
          ))}
        </Field>
        <p className="mt-1 text-xs text-zinc-500">Hold Ctrl/Cmd to select multiple.</p>
      </div>
    );
  }
  return (
    <div>
      <label className={labelClass}>{attr.name} (relation)</label>
      <Field as="select" name={attr.name} className={inputClass}>
        <option value="">— None —</option>
        {documents.map((doc) => (
          <option key={doc.documentId} value={doc.documentId}>
            {String(doc[titleKey] ?? doc.documentId)}
          </option>
        ))}
      </Field>
    </div>
  );
}

function FieldByType({
  attr,
  contentTypes,
  components,
}: {
  attr: ContentTypeAttribute;
  contentTypes: { singularId: string; pluralId: string; name: string }[];
  components: { id: string; name: string; category: string; attributes: ContentTypeAttribute[], icon: string | null }[];
}) {
  const inputClass =
    "w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block mb-1 text-sm text-zinc-400";

  if (attr.type === "relation") {
    return <RelationField attr={attr} contentTypes={contentTypes} />;
  }
  if (attr.type === "component") {
    return <ComponentField attr={attr} components={components} />;
  }
  if (attr.type === "dynamiczone") {
    return <DynamicZoneField attr={attr as ContentTypeAttribute & { components?: string[] }} components={components} />;
  }
  if (attr.type === "boolean") {
    return (
      <FormikSwitch name={attr.name} label={attr.name} />
    );
  }
  if (attr.type === "richtext" || attr.type === "richtext-markdown") {
    return (
      <FormikRichText
        name={attr.name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        placeholder="Write content…"
      />
    );
  }
  if (attr.type === "number") {
    return (
      <FormField
        name={attr.name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        type="number"
      />
    );
  }
  if (attr.type === "date") {
    return (
      <FormField
        name={attr.name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        type="datetime-local"
      />
    );
  }
  if (attr.type === "json") {
    return (
      <div>
        <label className={labelClass}>{attr.name}</label>
        <Field as="textarea" name={attr.name} rows={4} className={inputClass} placeholder="{}" />
      </div>
    );
  }
  if (attr.type === "media") {
    return (
      <MediaPicker name={attr.name} label={`${attr.name}${attr.required ? " *" : ""}`} />
    );
  }
  if (attr.type === "enumeration") {
    const options = Array.isArray(attr.enum) ? attr.enum : [];
    return (
      <div>
        <label className={labelClass}>{attr.name}{attr.required ? " *" : ""}</label>
        <Field as="select" name={attr.name} className={inputClass}>
          <option value="">— Select —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Field>
      </div>
    );
  }
  return (
    <FormField
      name={attr.name}
      label={`${attr.name}${attr.required ? " *" : ""}`}
      type={attr.type === "email" ? "email" : "text"}
    />
  );
}
