"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cashFlow } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { downloadCsv } from "@/modules/reporting";
import { cn } from "@/lib/utils/cn";
import { Download } from "lucide-react";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** حركة النقدية (ISS-013): افتتاحي + داخل − خارج = ختامي يوميًا، من دفتر حساب 1000 حصريًا، مع فروق الورديات. */
export function CashFlowView() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const { data, isLoading } = useQuery({
    queryKey: ["fin.cashflow", from, to],
    queryFn: ({ signal }) => cashFlow({ from, to }, signal),
    select: (r) => r.data,
  });

  // الأيام تصل تنازليًا؛ الرصيد الجاري يُبنى تصاعديًا من الافتتاحي
  const rows = (() => {
    if (!data) return [];
    const asc = [...data.days].reverse();
    let running = Number(data.opening);
    const out = asc.map((d) => {
      const open = running;
      running += Number(d.inflow) - Number(d.outflow);
      return { ...d, open, close: running };
    });
    return out.reverse();
  })();

  return (
    <Card>
      <CardHeader
        title="حركة النقدية اليومية"
        action={
          <span className="flex items-end gap-2">
            <Input label="من" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
            <Input label="إلى" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
            <Button size="sm" variant="ghost" disabled={!rows.length}
              onClick={() => downloadCsv(`cash-flow-${from}-${to}.csv`,
                ["اليوم", "افتتاحي", "داخل", "خارج", "ختامي", "فرق ورديات"],
                rows.map((r) => [new Date(r.day).toLocaleDateString("ar-EG"), r.open.toFixed(2), r.inflow, r.outflow, r.close.toFixed(2), r.overshort]))}>
              <Download className="size-3.5" /> CSV
            </Button>
          </span>
        }
      />
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !rows.length ? (
        <EmptyState title="لا حركة نقدية في الفترة" />
      ) : (
        <Table>
          <THead><Th>اليوم</Th><Th>افتتاحي</Th><Th>داخل +</Th><Th>خارج −</Th><Th>ختامي</Th><Th>فرق الورديات</Th></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={String(r.day)}>
                <Td className="num">{new Date(r.day).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}</Td>
                <Td className="num text-ink-soft">{r.open.toFixed(2)}</Td>
                <Td className="num text-primary-ink">+{formatMoney(r.inflow)}</Td>
                <Td className="num text-danger">−{formatMoney(r.outflow)}</Td>
                <Td className="num font-bold">{r.close.toFixed(2)}</Td>
                <Td className={cn("num", Number(r.overshort) !== 0 ? "font-bold text-warn" : "text-ink-faint")}>
                  {Number(r.overshort) === 0 ? "—" : formatMoney(r.overshort)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
