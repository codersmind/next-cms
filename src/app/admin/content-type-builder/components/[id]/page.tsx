"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { Puzzle, ListChecks, Plus, Trash2, Settings2 } from "lucide-react";
import { useGetComponentQuery, useUpdateComponentMutation, type ContentTypeAttribute } from "@/store/api/cmsApi";
import { FormField, FormikSwitch } from "@/components/forms";
import toast from "react-hot-toast";

const COMPONENT_FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "richtext", label: "Rich text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "media", label: "Media" },
  { value: "json", label: "JSON" },
] as const;

const schema = Yup.object({
  name: Yup.string().required("Name is required").trim(),
  category: Yup.string().required("Category is required").trim(),
  attributes: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().required("Field name required").matches(/^[a-zA-Z][a-zA-Z0-9]*$/, "Start with letter"),
        type: Yup.string().required(),
        required: Yup.boolean(),
      })
    )
    .min(1, "Add at least one field"),
});

type Values = Yup.InferType<typeof schema>;

const emptyAttr: ContentTypeAttribute = { name: "", type: "text", required: false };

function normalizeAttr(attr: ContentTypeAttribute): ContentTypeAttribute {
  return {
    name: attr.name ?? "",
    type: attr.type ?? "text",
    required: !!attr.required,
  };
}

export default function EditComponentPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: component, isLoading, error } = useGetComponentQuery(id);
  const [updateComponent, { isLoading: saving, error: updateError }] = useUpdateComponentMutation();

  if (isLoading || !component) {
    return (
      <div className="py-12 text-center text-zinc-500">
        {error ? "Component not found." : "Loading…"}
      </div>
    );
  }

  const initialValues: Values = {
    name: component.name,
    category: component.category ?? "shared",
    attributes: (component.attributes ?? []).length
      ? (component.attributes ?? []).map(normalizeAttr)
      : [{ ...emptyAttr }],
  };

  async function onSubmit(values: Values) {
    try {
      await updateComponent({
        id,
        name: values.name,
        category: values.category,
        attributes: values.attributes as ContentTypeAttribute[],
      }).unwrap();
      toast.success("Component saved.");
    } catch {
      toast.error("Failed to save component.");
    }
  }

  return (
    <div>
      <Link
        href="/admin/content-type-builder"
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← Back to Content-Type Builder
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <Puzzle className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit component</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {component.name} · {component.category}
          </p>
        </div>
      </div>

      {updateError && "data" in updateError && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {(updateError as { data?: { error?: string } }).data?.error ?? "Failed to save"}
        </div>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values }) => (
          <Form className="mt-8 space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Basic settings
              </h2>
              <FormField name="name" label="Display name" placeholder="e.g. SEO" />
              <FormField name="category" label="Category" placeholder="e.g. shared, blog" />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Fields
              </h2>
              <FieldArray name="attributes">
                {({ push, remove }) => (
                  <div className="space-y-4">
                    {(values.attributes ?? []).map((_, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                      >
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs text-zinc-500 mb-1">Name</label>
                          <Field
                            name={`attributes.${index}.name`}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                            placeholder="fieldName"
                          />
                        </div>
                        <div className="w-36">
                          <label className="block text-xs text-zinc-500 mb-1">Type</label>
                          <Field
                            as="select"
                            name={`attributes.${index}.type`}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                          >
                            {COMPONENT_FIELD_TYPES.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Field>
                        </div>
                        <FormikSwitch
                          name={`attributes.${index}.required`}
                          label="Required"
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => push({ ...emptyAttr })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-zinc-600 text-zinc-500 text-sm hover:border-zinc-500 hover:text-zinc-400"
                    >
                      <Plus className="w-4 h-4" />
                      Add another field
                    </button>
                  </div>
                )}
              </FieldArray>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save component"}
              </button>
              <Link
                href="/admin/content-type-builder"
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
