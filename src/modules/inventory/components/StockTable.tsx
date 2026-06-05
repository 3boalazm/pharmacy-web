"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStock } from "../api";
import { BatchDrawer } from "./BatchDrawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

type Filter = "ALL" | "LOW" | "EXPIRING";

const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "كل الأصناف" },
  { key: "LOW", label: "الأدوية الناقصة" },
  { key: "EXPIRING", label: "قريبة الانتهاء (90 يوم)" },
];

export function StockTable({ initialFilter = "ALL" }: { initialFilter?: Filter } = {}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["stock", filter, search],
    queryFn: ({ signal }) =>
      getStock(
        {
          search: search || undefined,
          belowMin: filter === "LOW" || undefined,
          expiringWithinDays: filter === "EXPIRING" ? 90 : undefined,
        },
        signal,
      ),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="flex rounded-el border border-line p-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-xs font-bold transition-colors",
                filter === f.key ? "bg-primary text-white" : "text-ink-soft hover:bg-paper",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في المخزون…"
          className="ms-auto h-9 w-64 rounded-el border border-line bg-card px-3 text-sm placeholder:text-ink-faint focus:border-primary"
        />
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد أصناف مطابقة" />
      ) : (
        <Table>
          <THead>
            <Th>الصنف</Th><Th>المتاح</Th><Th>حد الأمان</Th><Th>أقرب صلاحية</Th><Th>التشغيلات</Th><Th>الحالة</Th>
          </THead>
          <tbody>
            {data.map((r) => (
              <Tr key={r.medicineId} className="cursor-pointer" onClick={() => setOpen({ id: r.medicineId, name: r.tradeNameAr })}>
                <Td>
                  <p className="font-bold">{r.tradeNameAr}</p>
                  <p className="text-xs text-ink-faint">{r.scientificName}</p>
                </Td>
                <Td className="num font-bold">{r.onHand}</Td>
                <Td className="num text-ink-soft">{r.minStockLevel}</Td>
                <Td className="num text-ink-soft">{r.nearestExpiry ? new Date(r.nearestExpiry).toLocaleDateString("ar-EG") : "—"}</Td>
                <Td className="num">{r.batchCount}</Td>
                <Td>
                  {r.status === "OUT" ? <Badge tone="red">نفد</Badge>
                    : r.status === "LOW" ? <Badge tone="amber">ناقص</Badge>
                    : <Badge tone="green">متوفر</Badge>}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <BatchDrawer medicine={open} onClose={() => setOpen(null)} />
    </Card>
  );
}
