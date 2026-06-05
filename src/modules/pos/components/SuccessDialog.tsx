"use client";
import { printArea } from "@/lib/utils/print";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { CheckCircle2, Printer } from "lucide-react";
import type { SaleResponse } from "../types";

/** Receipt summary: totals, FEFO allocations (lot traceability), AR balance, loyalty. */
export function SuccessDialog({ sale, onClose }: { sale: SaleResponse | null; onClose: () => void }) {
  if (!sale) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" /> فاتورة {sale.invoiceNo}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2 text-sm">
          <p className="flex justify-between"><span className="text-ink-soft">الإجمالي</span><b className="num">{formatMoney(sale.total)}</b></p>
          <p className="flex justify-between"><span className="text-ink-soft">إجمالي الخصم</span><span className="num">{formatMoney(sale.totalDiscount)}</span></p>
          {sale.customerBalanceAfter !== null && (
            <p className="flex justify-between">
              <span className="text-ink-soft">رصيد العميل بعد العملية</span>
              <b className="num text-warn">{formatMoney(sale.customerBalanceAfter)}</b>
            </p>
          )}
          {sale.loyaltyPointsEarned > 0 && (
            <p className="flex justify-between"><span className="text-ink-soft">نقاط الولاء</span><Badge tone="green">+{sale.loyaltyPointsEarned}</Badge></p>
          )}
          <Separator className="my-2" />
          <div>
            <p className="mb-1 text-xs font-bold text-ink-soft">التشغيلات المخصصة (FEFO)</p>
            <ul className="space-y-1">
              {sale.allocations.map((a, i) => (
                <li key={i} className="flex justify-between rounded-el bg-paper px-2.5 py-1.5 text-xs">
                  <span className="font-mono">{a.batchNumber}</span>
                  <span className="num font-bold">×{a.qty}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => printArea("receipt")}><Printer className="size-4" /> طباعة إيصال</Button>
          <Button variant="secondary" onClick={onClose}>بيع جديد</Button>
          <Button onClick={() => window.open(sale.receipt.printPayloadUrl, "_blank")}>
            <Printer className="size-4" /> طباعة الفاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
