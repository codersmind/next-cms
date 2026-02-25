"use client";

import { useField } from "formik";
import { Switch, type SwitchProps } from "@/components/ui/Switch";

type FormikSwitchProps = Omit<SwitchProps, "checked" | "onChange" | "onBlur" | "name"> & {
  name: string;
};

export function FormikSwitch({ name, label, ...props }: FormikSwitchProps) {
  const [field] = useField({ name, type: "checkbox" });
  return (
    <Switch
      {...props}
      name={field.name}
      checked={!!field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      label={label}
    />
  );
}
