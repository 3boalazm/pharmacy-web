"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { installmentsOverview } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { HandCoins, Phone } from "lucide-react";

const BUCKETS = [
  { key: "overdue", label: "متأخر", tone: "red" },
  { key: "today", label: "مستحق اليوم", tone: "amber" },
  { key: "upcoming", label: "قادم (7 أيام)", tone: "blue" },
] as const;

/** الأقساط المجمعة عبر العملاء (ISS-015) — «تحصيل» ينقل لصفحة العميل حيث نموذج الدفعة القائم. */
export function InstallmentsView() {
  const router = useRouter();
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["key"]>("overdue");
  const { data, isLoading } = useQuery({
    queryKey: ["fin.installments", bucket],
    queryFn: ({ signal }) => installmentsOverview(bucket, signal),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {BUCKETS.map((b) => (
          <button key={b.key} onClick={() => setBucket(b.key)}
            className={cn("rounded-el px-3 py-2 text-xs font-bold", bucket === b.key ? "bg-primary text-white" : "text-ink-soft hover:bg-paper")}>
            {b.label}
          </button>
        ))}
        {data && (
          <span className="ms-auto text-xs text-ink-faint">
            <b className="num">{data.count}</b> قسط بإجمالي <b className="num text-ink">{formatMoney(data.total)}</b>
          </span>
        )}
      </div>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.rows.length ? (
        <EmptyState title={bucket === "overdue" ? "لا متأخرات 🎉" : "لا أقساط في هذه الفترة"} />
      ) : (
        <Table>
          <THead><Th>العميل</Th><Th>القسط</Th><Th>الاستحقاق</Th><Th>المتبقي</Th><Th>إجمالي مديونيته</Th><Th></Th></THead>
          <tbody>
            {data.rows.map((i) => (
              <Tr key={i.id}>
                <Td>
                  <p className="font-bold">{i.customer?.name ?? "—"}</p>
                  {i.customer && <a href={`tel:${i.customer.phone}`} className="num flex items-center gap-1 text-[11px] text-info" dir="ltr"><Phone className="size-3" />{i.customer.phone}</a>}
                </Td>
                <Td className="num">#{i.seq}</Td>
                <Td>
                  <span className="num text-xs">{new Date(i.dueDate).toLocaleDateString("ar-EG")}</span>
                  {bucket === "overdue" && <Badge tone="red">متأخر {Math.ceil((Date.now() - +new Date(i.dueDate)) / 86_400_000)} يوم</Badge>}
                </Td>
                <Td>
                  <span className="num font-bold">{formatMoney(String(Number(i.amount) - Number(i.paidAmount)))}</span>
                  {Number(i.paidAmount) > 0 && (
                    <p className="text-[10px] text-ink-faint">مدفوع جزئيًا <span className="num">{formatMoney(i.paidAmount)}</span> من <span className="num">{formatMoney(i.amount)}</span></p>
                  )}
                </Td>
                <Td className="num text-ink-soft">{i.customer ? formatMoney(i.customer.balanceCached) : "—"}</Td>
                <Td>
                  {i.customer && (
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/customers/${i.customer!.id}`)}>
                      <HandCoins className="size-3.5" /> تحصيل
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
