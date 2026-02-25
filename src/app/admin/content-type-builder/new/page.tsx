"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { Settings2, ListChecks, Plus, Trash2, Link2, Puzzle, LayoutGrid } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateContentTypeMutation, useGetContentTypesQuery, useGetComponentsQuery, type ContentTypeAttribute } from "@/store/api/cmsApi";
import { FormField, FormikSwitch } from "@/components/forms";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    || "";
}

function pluralize(singular: string): string {
  const s = singular.trim();
  if (!s) return "";
  if (s.endsWith("s") || s.endsWith("x") || s.endsWith("ch") || s.endsWith("sh")) return s + "es";
  if (/[^aeiou]y$/.test(s)) return s.slice(0, -1) + "ies";
  return s + "s";
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "richtext", label: "Rich text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
  { value: "email", label: "Email" },
  { value: "json", label: "JSON" },
  { value: "uid", label: "UID" },
  { value: "media", label: "Media" },
  { value: "enumeration", label: "Enumeration" },
  { value: "relation", label: "Relation" },
  { value: "component", label: "Component" },
  { value: "dynamiczone", label: "Dynamic zone" },
] as const;

const RELATION_KINDS = [
  { value: "oneToOne", label: "One to one" },
  { value: "oneToMany", label: "One to many" },
  { value: "manyToOne", label: "Many to one" },
  { value: "manyToMany", label: "Many to many" },
  { value: "oneWay", label: "One way" },
  { value: "manyWay", label: "Many way" },
] as const;

function componentUid(category: string, name: string): string {
  return `${category}.${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

function getValidationSchema(kind: "collectionType" | "singleType") {
  return Yup.object({
    name: Yup.string().required("Display name is required").trim(),
    singularId: Yup.string().required("API ID (singular) is required").matches(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, hyphens only"),
    pluralId:
      kind === "collectionType"
        ? Yup.string().required("API ID (plural) is required").matches(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, hyphens only")
        : Yup.string().optional().matches(/^[a-z0-9-]*$/, "Use lowercase letters, numbers, hyphens only"),
    draftPublish: Yup.boolean(),
    defaultPublicationState: Yup.string().oneOf(["draft", "published"]),
    attributes: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().required("Field name required").matches(/^[a-zA-Z][a-zA-Z0-9]*$/, "Start with letter, alphanumeric"),
          type: Yup.string().required(),
          required: Yup.boolean(),
          target: Yup.string(),
          relation: Yup.string(),
          component: Yup.string(),
          repeatable: Yup.boolean(),
          components: Yup.array().of(Yup.string()),
        })
      )
      .min(1, "Add at least one field"),
  });
}

type Values = Yup.InferType<ReturnType<typeof getValidationSchema>>;

const emptyAttribute: ContentTypeAttribute = {
  name: "",
  type: "text",
  required: false,
};

export default function NewContentTypePage() {
  const searchParams = useSearchParams();
  const kind = (searchParams.get("kind") === "singleType" ? "singleType" : "collectionType") as "collectionType" | "singleType";
  const router = useRouter();
  const [createContentType, { isLoading, error }] = useCreateContentTypeMutation();
  const { data: contentTypes } = useGetContentTypesQuery();
  const { data: components } = useGetComponentsQuery();
  const collectionTypes = (contentTypes ?? []).filter((t) => t.kind === "collectionType");

  const initialValues: Values = {
    name: "",
    singularId: "",
    pluralId: kind === "collectionType" ? "" : "",
    draftPublish: false,
    defaultPublicationState: "draft" as const,
    attributes: [{ ...emptyAttribute }],
  };

  async function onSubmit(values: Values) {
    const attributes = (values.attributes ?? []).map((attr) => {
      const a = { ...attr } as ContentTypeAttribute;
      if (attr.type === "relation") {
        a.target = attr.target || undefined;
        a.relation = (attr.relation as string) || "manyToOne";
      }
      if (attr.type === "component") {
        a.component = attr.component || undefined;
        a.repeatable = !!attr.repeatable;
      }
      if (attr.type === "dynamiczone") {
        a.components = Array.isArray(attr.components) ? attr.components : [];
      }
      return a;
    });
    try {
      await createContentType({
        name: values.name,
        singularId: values.singularId,
        pluralId: values.pluralId || values.singularId + "s",
        kind,
        draftPublish: values.draftPublish,
        defaultPublicationState: values.defaultPublicationState as "draft" | "published",
        attributes,
      }).unwrap();
      toast.success("Content type created.");
      router.push("/admin/content-type-builder");
    } catch {
      toast.error("Failed to create content type.");
    }
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
        <h1 className="mt-2 text-2xl font-bold text-white">
          Create new {kind === "collectionType" ? "collection" : "single"} type
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Define the display name, API IDs, and fields.
        </p>
      </div>

      {error && "data" in error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {(error as { data?: { error?: string } }).data?.error ?? "Failed to create"}
        </div>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={getValidationSchema(kind)}
        onSubmit={onSubmit}
      >
        {({ values, setFieldValue }) => {
          // Auto-fill singular from name, plural from singular
          useEffect(() => {
            const singular = slugFromName(values.name);
            if (singular) {
              setFieldValue("singularId", singular);
              if (kind === "collectionType") {
                setFieldValue("pluralId", pluralize(singular));
              }
            }
          }, [values.name, kind, setFieldValue]);
          useEffect(() => {
            if (kind === "collectionType" && values.singularId) {
              setFieldValue("pluralId", pluralize(values.singularId));
            }
          }, [values.singularId, kind, setFieldValue]);

          return (
          <Form className="space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Basic settings
              </h2>
              <FormField name="name" label="Display name" placeholder="e.g. Article" />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="singularId"
                  label="API ID (singular)"
                  placeholder="e.g. article"
                />
                {kind === "collectionType" && (
                  <FormField name="pluralId" label="API ID (plural)" placeholder="e.g. articles" />
                )}
              </div>
              <p className="text-xs text-zinc-500">
                API IDs are auto-generated from the display name. You can edit them.
              </p>
              <FormikSwitch name="draftPublish" label="Draft & Publish" />
              <div>
                <label className="block mb-1 text-sm text-zinc-400">Default when creating new entry</label>
                <Field as="select" name="defaultPublicationState" className="mt-1 w-full max-w-xs px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Field>
                <p className="mt-1 text-xs text-zinc-500">New entries will start as draft or published based on this setting.</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Fields
              </h2>
              <FieldArray name="attributes">
                {({ push, remove }) => (
                  <div className="space-y-4">
                    {(values.attributes ?? []).map((attr, index) => {
                      const type = attr.type as string;
                      const isRelation = type === "relation";
                      const isComponent = type === "component";
                      const isDynamicZone = type === "dynamiczone";
                      return (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-4"
                      >
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs text-zinc-500 mb-1">Name</label>
                            <Field
                              name={`attributes.${index}.name`}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                              placeholder="fieldName"
                            />
                          </div>
                          <div className="w-40">
                            <label className="block text-xs text-zinc-500 mb-1">Type</label>
                            <Field
                              as="select"
                              name={`attributes.${index}.type`}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                            >
                              {FIELD_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Field>
                          </div>
                          {!isRelation && !isComponent && !isDynamicZone && (
                            <FormikSwitch
                              name={`attributes.${index}.required`}
                              label="Required"
                              size="sm"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                        {isRelation && (
                          <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-zinc-700">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Link2 className="w-4 h-4" />
                              <span className="text-xs font-medium uppercase">Relation</span>
                            </div>
                            <div className="w-48">
                              <label className="block text-xs text-zinc-500 mb-1">Target (content type)</label>
                              <Field
                                as="select"
                                name={`attributes.${index}.target`}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                              >
                                <option value="">Select type…</option>
                                {collectionTypes.map((ct) => (
                                  <option key={ct.id} value={ct.singularId}>
                                    {ct.name} ({ct.singularId})
                                  </option>
                                ))}
                              </Field>
                            </div>
                            <div className="w-40">
                              <label className="block text-xs text-zinc-500 mb-1">Relation kind</label>
                              <Field
                                as="select"
                                name={`attributes.${index}.relation`}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                              >
                                {RELATION_KINDS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Field>
                            </div>
                          </div>
                        )}
                        {isComponent && (
                          <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-zinc-700">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Puzzle className="w-4 h-4" />
                              <span className="text-xs font-medium uppercase">Component</span>
                            </div>
                            <div className="w-56">
                              <label className="block text-xs text-zinc-500 mb-1">Component</label>
                              <Field
                                as="select"
                                name={`attributes.${index}.component`}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                              >
                                <option value="">Select component…</option>
                                {(components ?? []).map((comp) => (
                                  <option key={comp.id} value={componentUid(comp.category, comp.name)}>
                                    {comp.name} ({comp.category})
                                  </option>
                                ))}
                              </Field>
                            </div>
                            <FormikSwitch
                              name={`attributes.${index}.repeatable`}
                              label="Repeatable"
                              size="sm"
                            />
                          </div>
                        )}
                        {isDynamicZone && (
                          <div className="pt-2 border-t border-zinc-700 space-y-2">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <LayoutGrid className="w-4 h-4" />
                              <span className="text-xs font-medium uppercase">Dynamic zone – choose components</span>
                            </div>
                            <div>
                              <Field
                                as="select"
                                name={`attributes.${index}.components`}
                                multiple
                                className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm min-h-[100px]"
                              >
                                {(components ?? []).map((comp) => (
                                  <option key={comp.id} value={componentUid(comp.category, comp.name)}>
                                    {comp.name} ({comp.category})
                                  </option>
                                ))}
                              </Field>
                              <p className="mt-1 text-xs text-zinc-500">Hold Ctrl/Cmd to select multiple.</p>
                              {(components ?? []).length === 0 && (
                                <p className="text-sm text-zinc-500">Create components first.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                    <button
                      type="button"
                      onClick={() => push({ ...emptyAttribute })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-zinc-600 text-zinc-500 text-sm hover:border-zinc-500 hover:text-zinc-400"
                    >
                      <Plus className="w-4 h-4" />
                      Add another field
                    </button>
                  </div>
                )}
              </FieldArray>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Creating…" : "Create content type"}
              </button>
              <Link
                href="/admin/content-type-builder"
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
