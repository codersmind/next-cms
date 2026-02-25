"use client";

import { useField, type FieldConfig } from "formik";

type FormFieldProps = FieldConfig & {
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  as?: "input" | "textarea" | "select";
  children?: React.ReactNode;
};

const baseInputClass =
  "w-full px-3 py-2 bg-surface border border-border rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent";
const errorInputClass = "border-red-500 focus:ring-red-500";

export function FormField({
  label,
  type = "text",
  placeholder,
  className,
  inputClassName,
  as = "input",
  children,
  ...fieldProps
}: FormFieldProps) {
  const [field, meta] = useField(fieldProps);
  const hasError = meta.touched && meta.error;
  const inputClasses = [
    baseInputClass,
    hasError ? errorInputClass : "",
    inputClassName ?? "",
  ].join(" ");

  return (
    <div className={className}>
      <label
        htmlFor={field.name}
        className="block mb-1 text-sm text-zinc-300"
      >
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={field.name}
          {...field}
          className={inputClasses}
          placeholder={placeholder}
          rows={3}
        />
      ) : as === "select" ? (
        <select
          id={field.name}
          {...field}
          className={inputClasses}
        >
          {children}
        </select>
      ) : (
        <input
          id={field.name}
          type={type}
          {...field}
          className={inputClasses}
          placeholder={placeholder}
        />
      )}
      {hasError && (
        <p className="mt-1 text-sm text-red-400">{meta.error}</p>
      )}
    </div>
  );
}
