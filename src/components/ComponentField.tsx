"use client";

import { Field, FieldArray } from "formik";
import { FormField, FormikSwitch } from "@/components/forms";
import { FormikRichText } from "@/components/editor/FormikRichText";
import { MediaPicker } from "@/components/MediaPicker";
import type { ContentTypeAttribute } from "@/store/api/cmsApi";
import type { Component } from "@/store/api/cmsApi";
import { Plus, Trash2 } from "lucide-react";

function componentUid(category: string, name: string): string {
  return `${category}.${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

export function getDefaultComponentValue(compAttrs: ContentTypeAttribute[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const a of compAttrs ?? []) {
    obj[a.name] = a.type === "boolean" ? false : a.type === "number" ? "" : "";
  }
  return obj;
}

function ComponentAttributeField({
  baseName,
  attr,
}: {
  baseName: string;
  attr: ContentTypeAttribute;
}) {
  const name = `${baseName}.${attr.name}`;
  const inputClass =
    "w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block mb-1 text-sm text-zinc-400";

  if (attr.type === "boolean") {
    return <FormikSwitch name={name} label={attr.name} />;
  }
  if (attr.type === "richtext" || attr.type === "richtext-markdown") {
    return (
      <FormikRichText
        name={name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        placeholder=""
      />
    );
  }
  if (attr.type === "number") {
    return (
      <FormField
        name={name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        type="number"
      />
    );
  }
  if (attr.type === "date") {
    return (
      <FormField
        name={name}
        label={`${attr.name}${attr.required ? " *" : ""}`}
        type="datetime-local"
      />
    );
  }
  if (attr.type === "json") {
    return (
      <div>
        <label className={labelClass}>{attr.name}</label>
        <Field as="textarea" name={name} rows={3} className={inputClass} placeholder="{}" />
      </div>
    );
  }
  if (attr.type === "media") {
    return (
      <MediaPicker name={name} label={`${attr.name}${attr.required ? " *" : ""}`} />
    );
  }
  return (
    <FormField
      name={name}
      label={`${attr.name}${attr.required ? " *" : ""}`}
      type={attr.type === "email" ? "email" : "text"}
    />
  );
}

export function ComponentField({
  attr,
  components,
}: {
  attr: ContentTypeAttribute;
  components: Component[];
}) {
  const labelClass = "block mb-1 text-sm text-zinc-400";
  const componentUidValue = String(attr.component ?? "");
  const comp = components.find(
    (c) => componentUid(c.category, c.name) === componentUidValue
  );
  const compAttrs = (comp?.attributes ?? []) as ContentTypeAttribute[];

  if (!componentUidValue) {
    return (
      <div>
        <label className={labelClass}>{attr.name}</label>
        <p className="text-xs text-zinc-500">Select a component in Content-Type Builder.</p>
      </div>
    );
  }
  if (!comp) {
    return (
      <div>
        <label className={labelClass}>{attr.name}</label>
        <p className="text-xs text-zinc-500">Component “{componentUidValue}” not found.</p>
      </div>
    );
  }

  const defaultObj = getDefaultComponentValue(compAttrs);

  if (attr.repeatable) {
    return (
      <div>
        <label className={labelClass}>{attr.name} (repeatable)</label>
        <FieldArray name={attr.name}>
          {({ push, remove, form }) => {
            const items = (form.values[attr.name] as Record<string, unknown>[]) ?? [];
            return (
              <div className="space-y-3">
                {items.map((_, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-zinc-500 font-medium">Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 inline" /> Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      {compAttrs.map((ca) => (
                        <ComponentAttributeField
                          key={ca.name}
                          baseName={`${attr.name}.${index}`}
                          attr={ca}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => push({ ...defaultObj })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-600 text-zinc-500 text-sm hover:border-zinc-500 hover:text-zinc-400"
                >
                  <Plus className="w-4 h-4" />
                  Add {comp.name}
                </button>
              </div>
            );
          }}
        </FieldArray>
      </div>
    );
  }

  return (
    <div>
      <label className={labelClass}>{attr.name}</label>
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
        {compAttrs.map((ca) => (
          <ComponentAttributeField key={ca.name} baseName={attr.name} attr={ca} />
        ))}
      </div>
    </div>
  );
}
