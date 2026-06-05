"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional built-in field chrome (kept for existing call-sites; RHF forms use Form* helpers instead). */
  label?: string;
  hint?: string;
  error?: string;
}

const base =
  "flex h-10 w-full rounded-el border bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, ...props }, ref) => {
    const control = (
      <input ref={ref} className={cn(base, error ? "border-danger" : "border-line", className)} {...props} />
    );
    if (!label && !hint && !error) return control;
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>}
        {control}
        {error ? (
          <span className="mt-1 block text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="mt-1 block text-xs text-ink-faint">{hint}</span>
        ) : null}
      </label>
    );
  },
);
Input.displayName = "Input";
