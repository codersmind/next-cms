"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, FieldArray, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useGetContentTypeQuery,
  useGetContentTypesQuery,
  useGetComponentsQuery,
  useUpdateContentTypeMutation,
  useDeleteContentTypeMutation,
  type ContentType,
  type ContentTypeAttribute,
} from "@/store/api/cmsApi";
import { FormField, FormikSwitch } from "@/components/forms";
import { useState } from "react";
import toast from "react-hot-toast";
import { Trash2, ExternalLink, ListChecks, Plus, Link2, Puzzle, LayoutGrid, Settings2, GripVertical, ChevronRight, ListOrdered } from "lucide-react";

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

type AttributeForm = ContentTypeAttribute & {
  relation?: string;
  repeatable?: boolean;
  components?: string[];
  label?: string;
  unique?: boolean;
  className?: string;
  description?: string;
  private?: boolean;
  /** Enum default value (for type === "enumeration") */
  default?: string;
};

function normalizeAttribute(attr: ContentTypeAttribute): AttributeForm {
  return {
    name: attr.name ?? "",
    type: attr.type ?? "text",
    required: !!attr.required,
    target: attr.target ?? "",
    relation: (attr.relation as string) ?? "manyToOne",
    component: attr.component ?? "",
    repeatable: !!attr.repeatable,
    components: Array.isArray(attr.components) ? attr.components : [],
    enum: Array.isArray(attr.enum) ? attr.enum : [],
    default: typeof (attr as { default?: string }).default === "string" ? (attr as { default?: string }).default : "",
    label: typeof attr.label === "string" ? attr.label : "",
    unique: !!attr.unique,
    className: typeof attr.className === "string" ? attr.className : "",
    description: typeof (attr as { description?: string }).description === "string" ? (attr as { description?: string }).description : "",
    private: !!(attr as { private?: boolean }).private,
  };
}

const editSchema = Yup.object({
  name: Yup.string().required("Display name is required").trim(),
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
        enum: Yup.array().of(Yup.string()),
        default: Yup.string(),
        label: Yup.string(),
        unique: Yup.boolean(),
        className: Yup.string(),
        description: Yup.string(),
        private: Yup.boolean(),
      })
    )
    .min(1, "Add at least one field"),
});

type EditValues = Yup.InferType<typeof editSchema>;

const emptyAttribute: AttributeForm = {
  name: "",
  type: "text",
  required: false,
  relation: "manyToOne",
  repeatable: false,
  components: [],
  label: "",
  unique: false,
  className: "",
  description: "",
  private: false,
  enum: [],
  default: "",
};

function SortableFieldRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-4 ${isDragging ? "opacity-80 z-10 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function EnumerationOptions({ index }: { index: number }) {
  const { values, setFieldValue } = useFormikContext<EditValues>();
  const attr = values.attributes?.[index] as AttributeForm | undefined;
  const enumArr = Array.isArray(attr?.enum) ? attr.enum : [];
  const enumText = enumArr.join("\n");
  return (
    <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-zinc-700">
      <div className="flex items-center gap-2 text-zinc-400">
        <ListOrdered className="w-4 h-4" />
        <span className="text-xs font-medium uppercase">Enumeration</span>
      </div>
      <div className="w-full max-w-md">
        <label className="block text-xs text-zinc-500 mb-1">Values (one per line)</label>
        <textarea
          value={enumText}
          onChange={(e) => {
            const arr = e.target.value.split(/\n/).map((s) => s.trim());
            setFieldValue(`attributes.${index}.enum`, arr);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.stopPropagation();
          }}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm font-mono min-h-[80px]"
          placeholder="option1&#10;option2&#10;option3"
          rows={5}
        />
      </div>
      <div className="min-w-[180px]">
        <label className="block text-xs text-zinc-500 mb-1">Default value</label>
        <Field
          as="select"
          name={`attributes.${index}.default`}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
        >
          <option value="">No default</option>
          {enumArr.filter((s) => String(s).trim() !== "").map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Field>
      </div>
    </div>
  );
}

export default function EditContentTypePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: contentType, isLoading, error } = useGetContentTypeQuery(id);
  const { data: contentTypes } = useGetContentTypesQuery();
  const { data: components } = useGetComponentsQuery();
  const [updateContentType, { isLoading: saving, error: updateError }] = useUpdateContentTypeMutation();
  const [deleteContentType, { isLoading: deleting }] = useDeleteContentTypeMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const collectionTypes = (contentTypes ?? []).filter((t: ContentType) => t.kind === "collectionType");

  if (isLoading || !contentType) {
    return (
      <div className="py-12 text-center text-zinc-500">
        {error ? "Content type not found." : "Loading…"}
      </div>
    );
  }

  const initialValues: EditValues = {
    name: contentType.name,
    draftPublish: contentType.draftPublish ?? false,
    defaultPublicationState: contentType.defaultPublicationState === "published" ? "published" : "draft",
    attributes: (contentType.attributes ?? []).length
      ? (contentType.attributes ?? []).map(normalizeAttribute)
      : [emptyAttribute],
  };

  async function handleSubmit(values: EditValues) {
    const attributes = (values.attributes ?? []).map((attr) => {
      const a = { ...attr } as ContentTypeAttribute & Record<string, unknown>;
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
      if (attr.type === "enumeration") {
        a.enum = Array.isArray(attr.enum)
          ? (attr.enum as string[]).filter((s) => String(s).trim() !== "")
          : [];
        a.default = (attr as AttributeForm).default?.trim() || undefined;
      }
      a.label = (attr as AttributeForm).label?.trim() || undefined;
      a.unique = !!(attr as AttributeForm).unique;
      a.className = (attr as AttributeForm).className?.trim() || undefined;
      a.description = (attr as AttributeForm).description?.trim() || undefined;
      a.private = !!(attr as AttributeForm).private;
      return a as ContentTypeAttribute;
    });
    try {
      await updateContentType({ id, name: values.name, draftPublish: values.draftPublish, defaultPublicationState: values.defaultPublicationState as "draft" | "published", attributes }).unwrap();
      toast.success("Content type saved.");
    } catch {
      toast.error("Failed to save content type.");
    }
  }

  async function handleDelete() {
    try {
      await deleteContentType(id).unwrap();
      toast.success("Content type deleted.");
      router.push("/admin/content-type-builder");
    } catch {
      toast.error("Failed to delete.");
      setShowDeleteConfirm(false);
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
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Edit {contentType.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {contentType.kind === "collectionType"
                ? `Collection type · API: /api/${contentType.pluralId}`
                : `Single type · API: /api/${contentType.pluralId}`}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              API IDs: {contentType.singularId}
              {contentType.kind === "collectionType" ? ` / ${contentType.pluralId}` : ""} (read-only)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete content type
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4">
            <h3 className="font-semibold text-white">Delete this content type?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              All entries of this type will remain in the database but won’t be manageable from the admin. This cannot be undone for the schema.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-400 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {updateError && "data" in updateError && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {(updateError as { data?: { error?: string } }).data?.error ?? "Failed to update"}
        </div>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={editSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue }) => (
          <Form className="space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Basic settings
              </h2>
              <FormField name="name" label="Display name" placeholder="e.g. Article" />
              <div className="text-sm text-zinc-500">
                <span className="text-zinc-400">API ID (singular):</span> {contentType.singularId}
                {contentType.kind === "collectionType" && (
                  <>
                    {" · "}
                    <span className="text-zinc-400">API ID (plural):</span> {contentType.pluralId}
                  </>
                )}
              </div>
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
                Fields <span className="text-zinc-500 font-normal text-xs">(drag to reorder)</span>
              </h2>
              <FieldArray name="attributes">
                {({ push, remove }) => {
                  const attributes = values.attributes ?? [];
                  const handleDragEnd = (event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over == null || active.id === over.id) return;
                    const oldIndex = attributes.findIndex((_, i) => String(i) === active.id);
                    const newIndex = attributes.findIndex((_, i) => String(i) === over.id);
                    if (oldIndex === -1 || newIndex === -1) return;
                    const reordered = arrayMove(attributes, oldIndex, newIndex);
                    setFieldValue("attributes", reordered);
                  };
                  return (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={attributes.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                          {attributes.map((attr, index) => {
                            const type = attr.type as string;
                            const isRelation = type === "relation";
                            const isComponent = type === "component";
                            const isDynamicZone = type === "dynamiczone";
                            const isEnumeration = type === "enumeration";
                            return (
                              <SortableFieldRow key={index} id={String(index)}>
                                <>
                                  <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-xs text-zinc-500 mb-1">Name (API key)</label>
                              <Field
                                name={`attributes.${index}.name`}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                                placeholder="e.g. slug, title"
                              />
                              <p className="mt-0.5 text-xs text-zinc-600">Used in forms and document data</p>
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
                          <details className="group pt-2 border-t border-zinc-700">
                            <summary className="flex items-center gap-2 cursor-pointer list-none text-zinc-400 hover:text-zinc-300 text-sm font-medium">
                              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                              <Settings2 className="w-4 h-4" />
                              Advanced options
                            </summary>
                            <div className="mt-3 flex flex-wrap gap-4">
                              <div className="min-w-[160px] flex-1">
                                <label className="block text-xs text-zinc-500 mb-1">Label (display name)</label>
                                <Field
                                  name={`attributes.${index}.label`}
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                                  placeholder="Shown in list and form labels"
                                />
                              </div>
                              <div className="min-w-[160px] flex-1">
                                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                                <Field
                                  name={`attributes.${index}.description`}
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                                  placeholder="Help text (optional)"
                                />
                              </div>
                              <div className="min-w-[160px] flex-1">
                                <label className="block text-xs text-zinc-500 mb-1">Class name</label>
                                <Field
                                  name={`attributes.${index}.className`}
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm"
                                  placeholder="CSS class (optional)"
                                />
                              </div>
                              <div className="flex items-end gap-4">
                                <FormikSwitch
                                  name={`attributes.${index}.unique`}
                                  label="Unique"
                                  size="sm"
                                />
                                <FormikSwitch
                                  name={`attributes.${index}.private`}
                                  label="Private (exclude from API)"
                                  size="sm"
                                />
                              </div>
                            </div>
                          </details>
                          {isEnumeration && <EnumerationOptions index={index} />}
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
                                  {collectionTypes.map((ct: ContentType) => (
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
                                  {(components ?? []).map((comp: { id: string; name: string; category: string }) => (
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
                                  {(components ?? []).map((comp: { id: string; name: string; category: string }) => (
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
                                </>
                              </SortableFieldRow>
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
                      </SortableContext>
                    </DndContext>
                  );
                }}
              </FieldArray>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link
                href={`/admin/content-manager/${contentType.pluralId}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Content Manager
              </Link>
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
