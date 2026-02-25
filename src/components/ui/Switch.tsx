"use client";

import { forwardRef } from "react";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  size?: "sm" | "md";
}

const trackSizes = {
  sm: "w-8 h-4",
  md: "w-11 h-6",
};

const thumbSizes = {
  sm: "after:w-3 after:h-3 after:translate-x-0.5 peer-checked:after:translate-x-4",
  md: "after:w-5 after:h-5 after:translate-x-0.5 peer-checked:after:translate-x-5",
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, size = "md", className, disabled, ...props }, ref) => {
    return (
      <label
        className={`inline-flex items-center gap-3 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className ?? ""}`}
      >
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <span
          className={`
            relative inline-flex shrink-0 rounded-full bg-zinc-700 transition-colors duration-200
            after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:bg-white after:shadow after:transition-transform duration-200
            peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-900
            peer-checked:bg-indigo-600
            ${trackSizes[size]}
            ${thumbSizes[size]}
          `}
          aria-hidden
        />
        {label && (
          <span className="text-sm text-zinc-300 select-none">{label}</span>
        )}
      </label>
    );
  }
);

Switch.displayName = "Switch";
