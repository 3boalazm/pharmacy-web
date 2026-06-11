"use client";
/**
 * Toast system — sonner under the hood (shadcn standard), exposed through the
 * legacy ToastProvider/useToast API so every existing call-site keeps working.
 */
import { Toaster, toast as sonner } from "sonner";
import { useCallback } from "react";

type Tone = "success" | "warn" | "error";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-left"
        dir="rtl"
        toastOptions={{
          classNames: {
            toast: "slide-up rounded-card border font-sans shadow-pop",
            success: "!bg-primary-soft !text-primary-ink !border-primary/30",
            warning: "!bg-warn-soft !text-warn !border-warn/30",
            error: "!bg-danger-soft !text-danger !border-danger/30",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return useCallback((tone: Tone, text: string) => {
    if (tone === "success") sonner.success(text);
    else if (tone === "warn") sonner.warning(text);
    else sonner.error(text);
  }, []);
}
