"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReturn } from "../api";
import type { InvoiceDetail } from "../types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";

/**
 * مرتجع فاتورة (WF-3): اختيار كميات لكل سطر بحد أقصى (المباع − المرتجع سابقًا)؛
 * الخادم يعيد للتشغيلات الأصلية ويُرحّل القيد العكسي — الاسترداد نقدًا أو خصمًا من مديونية العميل.
 */
export function ReturnDialog({ invoice, open, onOpenChange }: {
  invoice: InvoiceDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");

  const ret = useMutation({
    mutationFn: () =>
      createReturn({
        invoiceId: invoice.id,
        reason: reason.trim(),
        lines: Object.entries(qty)
          .filter(([, q]) => q > 0)
          .map(([salesItemId, quantity]) => ({ salesItemId, quantity })),
      }),
    onSuccess: ({ data }) => {
      toast("success",
        data.refundMethod === "CASH"
          ? `تم المرتجع — استرداد نقدي ${formatMoney(data.refundTotal)}`
          : `تم المرتجع — خُصم ${formatMoney(data.refundTotal)} من مديونية العميل`);
      setQty({}); setReason("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: unknown) => toast("error", e instanceof ApiException ? e.error.message : "تعذر تنفيذ المرتجع"),
  });

  const anySelected = Object.values(qty).some((q) => q > 0);
  const refundPreview = invoice.lines.reduce((sum, l) => {
    const q = qty[l.id] ?? 0;
    const perUnit = (Number(l.lineTotal)) / l.quantity; // صافي الوحدة بعد خصم السطر
    return sum + perUnit * q;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader tone="danger"><DialogTitle>مرتجع — فاتورة {invoice.invoiceNo}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          <ul className="space-y-2">
            {invoice.lines.map((l) => {
              const max = l.quantity - (l.returnedQty ?? 0);
              return (
                <li key={l.id} className="flex items-center gap-3 rounded-el border border-line p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{l.nameAr ?? "صنف"}</p>
                    <p className="text-[11px] text-ink-faint">
                      مُباع <b className="num">{l.quantity}</b>
                      {(l.returnedQty ?? 0) > 0 && <> · مرتجع سابقًا <b className="num">{l.returnedQty}</b></>}
                      {" "}· الوحدة <span className="num">{formatMoney(l.unitPrice)}</span>
                    </p>
                  </div>
                  {max === 0 ? (
                    <Badge tone="gray">مرتجع بالكامل</Badge>
                  ) : (
                    <Input
                      type="number" min={0} max={max} dir="ltr"
                      className="num h-9 w-20 text-end"
                      value={qty[l.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => setQty((s) => ({ ...s, [l.id]: Math.min(Math.max(0, Number(e.target.value) || 0), max) }))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <Input label="سبب المرتجع (إلزامي — يُسجَّل بالتدقيق)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: العميل غيّر رأيه / صنف خاطئ" />
          {anySelected && (
            <p className="rounded-el bg-warn-soft px-3 py-2 text-sm font-bold text-warn">
              الاسترداد التقريبي: <span className="num">{refundPreview.toFixed(2)}</span> ج.م
              <span className="block text-[11px] font-normal">القيمة النهائية يحسبها الخادم بنسب الخصومات بدقة</span>
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button variant="destructive" loading={ret.isPending} disabled={!anySelected || reason.trim().length < 3}
            onClick={() => ret.mutate()}>
            تنفيذ المرتجع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
