"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAlerts, ackAlert, type Alert } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle, BellRing, CalendarClock, Scale, PackageX } from "lucide-react";

const meta: Record<string, { label: string; tone: "red" | "amber" | "blue" | "gray"; icon: React.ElementType }> = {
  LOW_STOCK: { label: "نقص مخزون", tone: "amber", icon: PackageX },
  EXPIRY: { label: "صلاحية", tone: "red", icon: CalendarClock },
  CREDIT_LIMIT: { label: "حد ائتمان", tone: "red", icon: Scale },
  RECONCILE: { label: "تسوية مطلوبة", tone: "amber", icon: AlertTriangle },
  DEBT_OVERDUE: { label: "مديونية متأخرة", tone: "red", icon: BellRing },
};

/** Alerts center — outbox-driven facts (LowStockDetected, CreditLimitBreached, …). ACK closes the loop. */
export function AlertsView() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["alerts", "UNREAD"],
    queryFn: ({ signal }) => listAlerts("UNREAD", signal),
    select: (r) => r.data,
    refetchInterval: 30_000,
  });
  const ack = useMutation({
    mutationFn: ackAlert,
    onSuccess: () => { toast("success", "تم تأكيد الاطلاع"); qc.invalidateQueries({ queryKey: ["alerts"] }); },
  });

  return (
    <Card>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد تنبيهات" hint="كل شيء تحت السيطرة" />
      ) : (
        <ul className="divide-y divide-line/60">
          {data.map((a: Alert) => {
            const m = meta[a.type] ?? { label: a.type, tone: "gray" as const, icon: BellRing };
            const Icon = m.icon;
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-el bg-paper">
                  <Icon className="size-4 text-ink-soft" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <span className="num text-[11px] text-ink-faint">{new Date(a.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink">{a.message}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => ack.mutate(a.id)}>تأكيد</Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
