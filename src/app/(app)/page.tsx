"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatMoney, type Money } from "@/lib/utils/money";
import { DashboardWidgets } from "@/modules/reporting";

/** GET /dashboard — Reporting module read model (Contract §10). */
interface Dashboard {
  todaySales: Money;
  cashInDrawer: Money;
  totalReceivables: Money;
  overduePayments: Money;
  profitMtd: Money;
  yesterdaySales: Money;
  salesMtd: Money;
  pendingOrders: string;
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
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label="مبيعات اليوم" value={formatMoney(data?.todaySales)} tone="good"
            delta={data && Number(data.yesterdaySales) > 0
              ? { pct: ((Number(data.todaySales) - Number(data.yesterdaySales)) / Number(data.yesterdaySales)) * 100, label: "عن أمس" }
              : null} />
          <KpiCard label="النقدية بالخزينة" value={formatMoney(data?.cashInDrawer)} />
          <KpiCard label="إجمالي المستحقات" value={formatMoney(data?.totalReceivables)} tone="warn" />
          <KpiCard label="مدفوعات متأخرة" value={formatMoney(data?.overduePayments)} tone="bad" />
          <KpiCard label="أرباح الشهر" value={formatMoney(data?.profitMtd)} tone="good" sub={data ? `مبيعات الشهر ${formatMoney(data.salesMtd)}` : undefined} />
          <KpiCard label="طلبات الستور المعلقة" value={data?.pendingOrders ?? "—"} tone={Number(data?.pendingOrders) > 0 ? "warn" : "default"} sub="بانتظار التجهيز" />
        </div>
        <DashboardWidgets />
        <p className="text-xs text-ink-faint">
          القيم لحظية من نماذج القراءة (Read Models) — تُحدَّث عبر أحداث النظام، ويمكن دائماً إعادة احتسابها من دفتر الأستاذ.
        </p>
      </div>
    </>
  );
}
