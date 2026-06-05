import { Card } from "./card";
import { cn } from "@/lib/utils/cn";

export function KpiCard({ label, value, tone = "default", sub, delta }: {
  label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" | "warn";
  /** نسبة التغير مقابل الفترة السابقة (مثل اليوم/أمس) — موجبة خضراء، سالبة حمراء */
  delta?: { pct: number; label: string } | null;
}) {
  return (
    <Card className="relative overflow-hidden px-4 py-4">
      <span className={cn("absolute inset-y-0 end-0 w-1 rounded-s",
        tone === "good" && "bg-primary", tone === "bad" && "bg-danger", tone === "warn" && "bg-warn")} />
      <p className="text-xs font-semibold text-ink-faint">{label}</p>
      <p className="num mt-1 text-2xl font-extrabold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
      {delta && Number.isFinite(delta.pct) && (
        <p className={cn("num mt-0.5 text-[11px] font-bold", delta.pct >= 0 ? "text-primary-ink" : "text-danger")}>
          {delta.pct >= 0 ? "▲" : "▼"} {Math.abs(delta.pct).toFixed(0)}% <span className="font-normal text-ink-faint">{delta.label}</span>
        </p>
      )}
    </Card>
  );
}
