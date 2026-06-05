"use client";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** QuickActionButton — إجراء يومي بنقرة من لوحة التحكم. */
export function QuickActionButton({ href, label, icon: Icon, tone = "default" }: {
  href: string; label: string; icon: React.ElementType; tone?: "default" | "primary";
}) {
  return (
    <Link href={href}
      className={cn(
        "hover-lift flex items-center gap-2.5 rounded-card border px-4 py-3 text-sm font-bold",
        tone === "primary"
          ? "border-primary bg-primary text-white hover:opacity-90"
          : "border-line bg-card text-ink hover:bg-paper",
      )}>
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
