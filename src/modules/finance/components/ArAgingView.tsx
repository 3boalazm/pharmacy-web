"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { arAging } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { downloadCsv } from "@/modules/reporting";
import { cn } from "@/lib/utils/cn";
import { Download } from "lucide-react";

const COLS = [
  ["current", "حالي (غير مستحق)"], ["d30", "1-30 يوم"], ["d60", "31-60"],
  ["d90", "61-90"], ["d90p", "+90 ⚠"], ["unscheduled", "غير مجدول"],
] as const;

/** أعمار الديون: من يدين بماذا ومنذ متى — أهم تقرير تحصيل، مشتق من الأقساط المعلقة ورصيد الدفتر. */
export function ArAgingView() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["ar.aging"], queryFn: ({ signal }) => arAging(signal), select: (r) => r.data });

  return (
    <Card>
      <CardHeader
        title="أعمار ديون العملاء"
        action={
          <Button size="sm" variant="ghost" disabled={!data?.rows.length}
            onClick={() => data && downloadCsv("ar-aging.csv",
              ["العميل", "الهاتف", "الرصيد", ...COLS.map(([, l]) => l)],
              data.rows.map((r) => [r.name, r.phone, r.balance, ...COLS.map(([k]) => r[k])]))}>
            <Download className="size-3.5" /> CSV
          </Button>
        }
      />
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.rows.length ? (
        <EmptyState title="لا ديون قائمة 🎉" hint="كل أرصدة العملاء صفرية" />
      ) : (
        <Table>
          <THead>
            <Th>العميل</Th><Th>إجمالي الرصيد</Th>
            {COLS.map(([k, l]) => <Th key={k}>{l}</Th>)}
          </THead>
          <tbody>
            {data.rows.map((r) => (
              <Tr key={r.customerId} className="cursor-pointer hover:bg-paper" onClick={() => router.push(`/customers/${r.customerId}`)}>
                <Td><p className="font-bold">{r.name}</p><p className="num text-[11px] text-ink-faint" dir="ltr">{r.phone}</p></Td>
                <Td className="num font-extrabold">{formatMoney(r.balance)}</Td>
                {COLS.map(([k]) => (
                  <Td key={k} className={cn("num", k === "d90p" && Number(r[k]) > 0 && "font-bold text-danger", k === "unscheduled" && Number(r[k]) > 0 && "text-ink-faint")}>
                    {Number(r[k]) > 0 ? formatMoney(r[k]) : "—"}
                  </Td>
                ))}
              </Tr>
            ))}
            {data.totals && (
              <Tr className="bg-paper font-extrabold">
                <Td>الإجمالي</Td>
                <Td className="num">{formatMoney(data.totals.balance)}</Td>
                {COLS.map(([k]) => <Td key={k} className="num">{formatMoney(data.totals![k])}</Td>)}
              </Tr>
            )}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
