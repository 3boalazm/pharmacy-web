"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api/http";
import type { Money } from "@/lib/utils/money";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

interface MovementRow {
  id: string; type: string; quantity: number; unitCost: Money;
  referenceType: string; createdAt: string;
  medicine: { tradeNameAr: string; form: string } | null; batchNumber: string | null;
}

const TYPE_AR: Record<string, { label: string; tone: "green" | "red" | "blue" | "amber" | "gray" }> = {
  GRN: { label: "استلام", tone: "green" },
  SALE: { label: "بيع", tone: "blue" },
  RETURN: { label: "مرتجع", tone: "amber" },
  ADJUSTMENT: { label: "تسوية", tone: "gray" },
  WRITE_OFF: { label: "إعدام", tone: "red" },
};

/** سجل حركات المخزون الدائم — كل دخول وخروج بمرجعه؛ غير قابل للتعديل أو الحذف. */
export function MovementsTable() {
  const [type, setType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["inv.movements", type],
    queryFn: async ({ signal }) => (await api<MovementRow[]>(`/movements${qs({ type: type || undefined })}`, { signal })).data,
  });

  return (
    <Card>
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        {[["", "الكل"], ...Object.entries(TYPE_AR).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setType(k as string)}
            className={cn("rounded-el px-3 py-2 text-xs font-bold", type === k ? "bg-primary text-white" : "text-ink-soft hover:bg-paper")}>
            {label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا حركات بعد" hint="كل استلام وبيع ومرتجع وتسوية سيظهر هنا فور حدوثه" />
      ) : (
        <Table>
          <THead><Th>التاريخ</Th><Th>الصنف</Th><Th>التشغيلة</Th><Th>النوع</Th><Th>الكمية</Th></THead>
          <tbody>
            {data.map((m) => {
              const t = TYPE_AR[m.type] ?? { label: m.type, tone: "gray" as const };
              return (
                <Tr key={m.id}>
                  <Td className="num text-xs">{new Date(m.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                  <Td><p className="text-xs font-bold">{m.medicine?.tradeNameAr ?? "—"}</p><p className="text-[10px] text-ink-faint">{m.medicine?.form}</p></Td>
                  <Td className="font-mono text-xs" dir="ltr">{m.batchNumber ?? "—"}</Td>
                  <Td><Badge tone={t.tone}>{t.label}</Badge></Td>
                  <Td className={cn("num font-extrabold", m.quantity > 0 ? "text-primary-ink" : "text-danger")}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
