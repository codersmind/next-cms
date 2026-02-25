"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useGetContentTypesQuery, useGetDocumentsQuery, useGetComponentsQuery, useCreateDocumentMutation, type ContentTypeAttribute } from "@/store/api/cmsApi";
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

export default function NewDocumentPage() {
  const params = useParams();
  const pluralId = params.pluralId as string;
  const router = useRouter();
  const { data: contentTypes } = useGetContentTypesQuery();
  const { data: components } = useGetComponentsQuery();
  const contentType = contentTypes?.find((t) => t.pluralId === pluralId);
  const [createDocument, { isLoading, error }] = useCreateDocumentMutation();

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

  const attributes = (contentType.attributes ?? []) as ContentTypeAttribute[];
  const initialValues: Record<string, unknown> = {};
  const shape: Record<string, Yup.AnySchema> = {};
  for (const attr of attributes) {
    switch (attr.type) {
      case "text":
      case "richtext":
      case "richtext-markdown":
      case "email":
      case "uid":
        initialValues[attr.name] = "";
        shape[attr.name] = attr.required ? Yup.string().required(`${attr.name} is required`) : Yup.string();
        break;
      case "number":
        initialValues[attr.name] = "";
        shape[attr.name] = attr.required ? Yup.number().required() : Yup.number().nullable();
        break;
      case "boolean":
        initialValues[attr.name] = false;
        shape[attr.name] = Yup.boolean();
        break;
      case "date":
        initialValues[attr.name] = "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        break;
      case "json":
        initialValues[attr.name] = "{}";
        shape[attr.name] = Yup.string();
        break;
      case "relation": {
        const multi = ["oneToMany", "manyToMany", "manyWay"].includes(String(attr.relation));
        initialValues[attr.name] = multi ? [] : "";
        shape[attr.name] = attr.required ? (multi ? Yup.array().min(1) : Yup.string().required()) : (multi ? Yup.array() : Yup.string());
        break;
      }
      case "media":
      case "enumeration":
        initialValues[attr.name] = "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
        break;
      case "component": {
        const comp = components?.find((c) => componentUid(c.category, c.name) === attr.component);
        const compAttrs = (comp?.attributes ?? []) as ContentTypeAttribute[];
        const defaultObj = getDefaultComponentValue(compAttrs);
        initialValues[attr.name] = attr.repeatable ? [defaultObj] : defaultObj;
        break;
      }
      case "dynamiczone":
        initialValues[attr.name] = [];
        break;
      default:
        initialValues[attr.name] = "";
        shape[attr.name] = attr.required ? Yup.string().required() : Yup.string();
    }
  }
  const schema = Yup.object(shape);

  async function onSubmit(values: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    for (const attr of attributes) {
      const v = values[attr.name];
      if (v === "" || v === undefined) continue;
      if (attr.type === "number" && v !== "") data[attr.name] = Number(v);
      else if (attr.type === "json" && typeof v === "string") {
        try {
          data[attr.name] = JSON.parse(v);
        } catch {
          data[attr.name] = v;
        }
      } else data[attr.name] = v;
    }
    try {
      const res = await createDocument({ contentType: pluralId, data }).unwrap();
      const doc = res.data as { documentId?: string };
      if (doc?.documentId) {
        router.push(`/admin/content-manager/${pluralId}/${doc.documentId}`);
      } else {
        router.push(`/admin/content-manager/${pluralId}`);
      }
    } catch {
      // error from mutation
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
        Create new {contentType.name} entry
      </h1>

      {error && "data" in error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {(error as { data?: { error?: string } }).data?.error ?? "Failed to create"}
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
        <Form className="mt-6 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            {attributes.map((attr) => (
              <FieldByType key={attr.name} attr={attr} contentTypes={contentTypes ?? []} components={components ?? []} />
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Creating…" : "Create"}
            </button>
            <Link
              href={`/admin/content-manager/${pluralId}`}
              className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </Link>
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
    return (
      <RelationField attr={attr} contentTypes={contentTypes} />
    );
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
