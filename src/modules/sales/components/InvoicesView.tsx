"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, getInvoice } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";

const methodAr = { CASH: "نقدي", CARD: "بطاقة", CREDIT: "آجل", SPLIT: "مختلط" } as const;
const methodTone = { CASH: "green", CARD: "blue", CREDIT: "amber", SPLIT: "gray" } as const;

/** Invoices list + immutable detail (lines, FEFO allocations, journal linkage). */
export function InvoicesView({ customerId, compact }: { customerId?: string; compact?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", customerId ?? "all"],
    queryFn: ({ signal }) => listInvoices({ customerId }, signal),
    select: (r) => r.data,
  });
  const detail = useQuery({
    queryKey: ["invoice", openId],
    queryFn: () => getInvoice(openId!),
    enabled: !!openId,
    select: (r) => r.data,
  });

  const body = isLoading ? (
    <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
  ) : !data?.length ? (
    <EmptyState title="لا توجد فواتير" hint={customerId ? "لم يشترِ هذا العميل بعد" : undefined} />
  ) : (
    <Table>
      <THead>
        <Th>الفاتورة</Th><Th>التاريخ</Th><Th>الدفع</Th><Th>الخصم</Th><Th>الإجمالي</Th>
      </THead>
      <tbody>
        {data.map((inv) => (
          <Tr key={inv.id} className="cursor-pointer" onClick={() => setOpenId(inv.id)}>
            <Td className="font-mono text-xs font-bold text-primary-ink">{inv.invoiceNo}</Td>
            <Td className="num text-ink-soft">{new Date(inv.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
            <Td><Badge tone={methodTone[inv.paymentMethod]}>{methodAr[inv.paymentMethod]}</Badge></Td>
            <Td className="num text-ink-soft">{formatMoney(inv.totalDiscount)}</Td>
            <Td className="num font-extrabold">{formatMoney(inv.total)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );

  return (
    <>
      {compact ? body : <Card>{body}</Card>}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>فاتورة {detail.data?.invoiceNo ?? ""}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {!detail.data ? (
              <p className="py-6 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
            ) : (
              <div className="space-y-3 text-sm">
                <Table>
                  <THead><Th>الكمية</Th><Th>سعر الوحدة</Th><Th>الخصم</Th><Th>الإجمالي</Th><Th>التشغيلات</Th></THead>
                  <tbody>
                    {detail.data.lines.map((l) => (
                      <Tr key={l.id}>
                        <Td className="num font-bold">{l.quantity}</Td>
                        <Td className="num">{formatMoney(l.unitPrice)}</Td>
                        <Td className="num text-ink-soft">{formatMoney(l.discount)}</Td>
                        <Td className="num font-bold">{formatMoney(l.lineTotal)}</Td>
                        <Td className="text-xs text-ink-faint">{l.allocations.map((a) => `×${a.quantity}`).join("، ")}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <Separator />
                <p className="flex justify-between"><span className="text-ink-soft">الإجمالي الفرعي</span><span className="num">{formatMoney(detail.data.subtotal)}</span></p>
                <p className="flex justify-between"><span className="text-ink-soft">الخصم</span><span className="num text-danger">-{formatMoney(detail.data.totalDiscount)}</span></p>
                <p className="flex justify-between text-base font-extrabold"><span>الإجمالي</span><span className="num">{formatMoney(detail.data.total)}</span></p>
                <p className="text-[11px] text-ink-faint">قيد محاسبي: <span className="font-mono">{detail.data.journalEntryId}</span> — الفاتورة حقيقة غير قابلة للتعديل؛ التصحيح بمرتجع/قيد عكسي.</p>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
