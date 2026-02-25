"use client";

import { useField } from "formik";
import { RichTextEditor } from "./RichTextEditor";

export function FormikRichText({
  name,
  label,
  placeholder,
  className,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const [field, , helpers] = useField<string>(name);
  return (
    <div className={className}>
      {label && (
        <label className="block mb-1 text-sm text-zinc-400">{label}</label>
      )}
      <RichTextEditor
        value={field.value ?? ""}
        onChange={(v) => helpers.setValue(v)}
        placeholder={placeholder}
      />
    </div>
  );
}
