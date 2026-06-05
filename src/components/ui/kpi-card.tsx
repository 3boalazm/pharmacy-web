import { Card } from "./card";
import { cn } from "@/lib/utils/cn";

export function KpiCard({ label, value, tone = "default", sub }: {
  label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" | "warn";
}) {
  return (
    <Card className="relative overflow-hidden px-4 py-4">
      <span className={cn("absolute inset-y-0 end-0 w-1 rounded-s",
        tone === "good" && "bg-primary", tone === "bad" && "bg-danger", tone === "warn" && "bg-warn")} />
      <p className="text-xs font-semibold text-ink-faint">{label}</p>
      <p className="num mt-1 text-2xl font-extrabold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </Card>
  );
}
