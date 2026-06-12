"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportSummary, reportDaily, reportTop, downloadCsv } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { Download } from "lucide-react";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS = [
  { key: "today", label: "اليوم", days: 0 },
  { key: "week", label: "٧ أيام", days: 6 },
  { key: "month", label: "٣٠ يومًا", days: 29 },
] as const;

/** شاشة التقارير — الثمانية المطلوبة بالاستبيان في مكان واحد بفترات وتصدير CSV. */
export function ReportsView() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const params = { from, to };

  const summary = useQuery({ queryKey: ["rep.sum", params], queryFn: ({ signal }) => reportSummary(params, signal), select: (r) => r.data });
  const daily = useQuery({ queryKey: ["rep.daily", params], queryFn: ({ signal }) => reportDaily(params, signal), select: (r) => r.data });
  const top = useQuery({ queryKey: ["rep.top", params], queryFn: ({ signal }) => reportTop(params, signal), select: (r) => r.data });

  function preset(days: number) {
    setFrom(iso(new Date(Date.now() - days * 86_400_000)));
    setTo(iso(new Date()));
  }

  const s = summary.data;
  return (
    <div className="space-y-4">
      {/* الفترة */}
      <Card>
        <div className="flex flex-wrap items-end gap-2 p-3">
          <div className="flex rounded-el border border-line p-0.5">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => preset(p.days)}
                className="rounded-[6px] px-3 py-2 text-xs font-bold text-ink-soft hover:bg-paper">
                {p.label}
              </button>
            ))}
          </div>
          <Input label="من" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
          <Input label="إلى" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
        </div>
      </Card>

      {/* الملخص */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="إجمالي المبيعات" value={s ? formatMoney(s.salesTotal) : "…"} />
        <KpiCard label="مجمل الربح" value={s ? formatMoney(s.grossProfit) : "…"} tone="good" sub="المبيعات − تكلفة البضاعة" />
        <KpiCard label="عدد الفواتير" value={s ? String(s.invoices) : "…"} />
        <KpiCard label="الخصومات" value={s ? formatMoney(s.discounts) : "…"} />
        <KpiCard label="المرتجعات" value={s ? formatMoney(s.returnsTotal) : "…"} tone={s && Number(s.returnsTotal) > 0 ? "warn" : undefined} />
      </div>

      {/* الأكثر مبيعًا */}
      <Card>
        <CardHeader
          title="الأدوية الأكثر مبيعًا"
          action={
            <Button size="sm" variant="ghost" disabled={!top.data?.length}
              onClick={() => top.data && downloadCsv(`top-medicines-${from}-${to}.csv`,
                ["الدواء", "الشكل", "الكمية", "الإيراد"],
                top.data.map((t) => [t.nameAr, t.form, Number(t.quantity), t.revenue]))}>
              <Download className="size-3.5" /> CSV
            </Button>
          }
        />
        {!top.data?.length ? (
          <EmptyState title="لا مبيعات في الفترة" />
        ) : (
          <Table>
            <THead><Th>#</Th><Th>الدواء</Th><Th>الكمية المباعة</Th><Th>الإيراد</Th></THead>
            <tbody>
              {top.data.map((t, i) => (
                <Tr key={t.medicineId}>
                  <Td className={cn("num font-extrabold", i < 3 && "text-primary-ink")}>{i + 1}</Td>
                  <Td><p className="font-bold">{t.nameAr}</p><p className="text-xs text-ink-faint">{t.form}</p></Td>
                  <Td className="num font-bold">{Number(t.quantity)}</Td>
                  <Td className="num">{formatMoney(t.revenue)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* يوم بيوم */}
      <Card>
        <CardHeader
          title="المبيعات اليومية"
          action={
            <Button size="sm" variant="ghost" disabled={!daily.data?.length}
              onClick={() => daily.data && downloadCsv(`daily-sales-${from}-${to}.csv`,
                ["اليوم", "عدد الفواتير", "المبيعات", "الربح"],
                daily.data.map((d) => [new Date(d.day).toLocaleDateString("ar-EG"), Number(d.invoices), d.total, d.profit]))}>
              <Download className="size-3.5" /> CSV
            </Button>
          }
        />
        {!daily.data?.length ? (
          <EmptyState title="لا بيانات" />
        ) : (
          <Table>
            <THead><Th>اليوم</Th><Th>الفواتير</Th><Th>المبيعات</Th><Th>الربح</Th></THead>
            <tbody>
              {daily.data.map((d) => (
                <Tr key={String(d.day)}>
                  <Td className="num">{new Date(d.day).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}</Td>
                  <Td className="num">{Number(d.invoices)}</Td>
                  <Td className="num font-bold">{formatMoney(d.total)}</Td>
                  <Td className="num text-primary-ink">{formatMoney(d.profit)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-ink-faint">
        باقي تقارير الاستبيان في أماكنها المتخصصة: الأدوية الناقصة وقريبة الانتهاء في «المخزون»، حسابات العملاء في «العملاء»، وميزان المراجعة في «المالية».
      </p>
    </div>
  );
}
