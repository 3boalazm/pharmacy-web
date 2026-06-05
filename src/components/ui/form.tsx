"use client";
/** shadcn/ui Form helpers — RHF context + accessible field wiring. */
import * as React from "react";
import {
  Controller, FormProvider, useFormContext,
  type ControllerProps, type FieldPath, type FieldValues,
} from "react-hook-form";
import { Label } from "./label";
import { cn } from "@/lib/utils/cn";

export const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);
const FormItemContext = React.createContext<{ id: string }>({} as { id: string });

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>,
) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  return { id: itemContext.id, name: fieldContext.name, ...fieldState };
}

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel(props: React.ComponentPropsWithoutRef<typeof Label>) {
  const { id, error } = useFormField();
  return <Label htmlFor={id} className={cn(error && "text-danger")} {...props} />;
}

export function FormControl({ children }: { children: React.ReactElement }) {
  const { id } = useFormField();
  return React.cloneElement(children, { id });
}

export function FormMessage({ className }: { className?: string }) {
  const { error } = useFormField();
  if (!error?.message) return null;
  return <p className={cn("text-xs font-medium text-danger", className)}>{String(error.message)}</p>;
}
