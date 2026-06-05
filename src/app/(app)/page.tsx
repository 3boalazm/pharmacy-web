"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatMoney, type Money } from "@/lib/utils/money";

/** GET /dashboard — Reporting module read model (Contract §10). */
interface Dashboard {
  todaySales: Money;
  cashInDrawer: Money;
  totalReceivables: Money;
  overduePayments: Money;
  profitMtd: Money;
}

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
    select: (r) => r.data,
    refetchInterval: 30_000,
  });

  return (
    <>
      <Topbar title="لوحة التحكم" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <KpiCard label="مبيعات اليوم" value={formatMoney(data?.todaySales)} tone="good" />
          <KpiCard label="النقدية بالخزينة" value={formatMoney(data?.cashInDrawer)} />
          <KpiCard label="إجمالي المستحقات" value={formatMoney(data?.totalReceivables)} tone="warn" />
          <KpiCard label="مدفوعات متأخرة" value={formatMoney(data?.overduePayments)} tone="bad" />
          <KpiCard label="أرباح الشهر" value={formatMoney(data?.profitMtd)} tone="good" />
        </div>
        <p className="text-xs text-ink-faint">
          القيم لحظية من نماذج القراءة (Read Models) — تُحدَّث عبر أحداث النظام، ويمكن دائماً إعادة احتسابها من دفتر الأستاذ.
        </p>
      </div>
    </>
  );
}
