"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/modules/reporting";
import { cn } from "@/lib/utils/cn";
import { Download } from "lucide-react";

interface ReorderRow {
  id: string; name: string; stock: number; minLevel: number;
  sold28: number; dailyVelocity: string; daysLeft: number | null; suggestedQty: number;
}

/** اقتراح الشراء: تحت حد الأمان أو سيكفي أقل من أسبوع بسرعة بيع 28 يومًا — قائمة جاهزة للمورد. */
export function ReorderTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["inv.reorder"],
    queryFn: async ({ signal }) => (await api<ReorderRow[]>("/reorder-suggestions", { signal })).data,
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line p-3">
        <p className="text-sm font-bold">قائمة الشراء المقترحة <span className="num text-xs text-ink-faint">({data?.length ?? "…"})</span></p>
        <Button size="sm" variant="ghost" disabled={!data?.length}
          onClick={() => data && downloadCsv("reorder-list.csv",
            ["الصنف", "المتاح", "حد الأمان", "بيع يومي", "يكفي (يوم)", "مقترح الشراء"],
            data.map((r) => [r.name, r.stock, r.minLevel, r.dailyVelocity, r.daysLeft ?? "—", r.suggestedQty]))}>
          <Download className="size-3.5" /> CSV للمورد
        </Button>
      </div>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ الحساب من سرعة البيع…</p>
      ) : !data?.length ? (
        <EmptyState title="لا نواقص 🎉" hint="كل الأصناف فوق حد الأمان وتكفي أكثر من أسبوع" />
      ) : (
        <Table>
          <THead><Th>الصنف</Th><Th>المتاح</Th><Th>بيع يومي</Th><Th>يكفي</Th><Th>مقترح الشراء</Th></THead>
          <tbody>
            {data.map((r) => (
              <Tr key={r.id}>
                <Td className="font-bold">{r.name}</Td>
                <Td><span className={cn("num font-bold", r.stock === 0 ? "text-danger" : r.stock <= r.minLevel ? "text-warn" : "")}>{r.stock}</span>
                  {r.stock === 0 && <Badge tone="red">نافد</Badge>}</Td>
                <Td className="num text-xs text-ink-soft">{r.dailyVelocity}</Td>
                <Td className={cn("num text-xs", r.daysLeft !== null && r.daysLeft <= 3 && "font-bold text-danger")}>
                  {r.daysLeft === null ? "—" : `${r.daysLeft} يوم`}
                </Td>
                <Td className="num text-base font-extrabold text-primary-ink">{r.suggestedQty}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
