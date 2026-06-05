"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open, onClose, title, children, footer, tone = "default", wide,
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
  tone?: "default" | "danger"; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("rise relative w-full rounded-card bg-card shadow-pop", wide ? "max-w-3xl" : "max-w-md")}>
        <div className={cn("flex items-center justify-between rounded-t-card border-b px-5 py-4",
          tone === "danger" ? "border-danger-soft bg-danger-soft/50" : "border-line")}>
          <h2 className={cn("text-base font-bold", tone === "danger" ? "text-danger" : "text-ink")}>{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded p-1 text-ink-faint hover:bg-paper">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
