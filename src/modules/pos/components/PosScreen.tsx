"use client";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePosStore, cartTotals, redeemValue } from "../store";
import { createSale } from "../api";
import type { DurAlert, InstallmentPlan, PaymentMethod, SaleResponse } from "../types";
import { ProductSearch } from "./ProductSearch";
import { CartPanel } from "./CartPanel";
import { SummaryPanel } from "./SummaryPanel";
import { PaymentDialog } from "./PaymentDialog";
import { DurDialog } from "./DurDialog";
import { SuccessDialog } from "./SuccessDialog";
import { Receipt, type ReceiptData } from "@/components/print/Receipt";
import { PinElevateDialog } from "@/components/app/pin-elevate-dialog";
import { ApiException } from "@/lib/api/http";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils/money";

type CheckoutMethod = Exclude<PaymentMethod, "SPLIT">;
interface PendingPayment { method: PaymentMethod; installmentPlan?: InstallmentPlan; splits?: { method: CheckoutMethod; amount: string }[] }

/**
 * POS orchestrator — layout per the system wireframe (search · cart · summary, RTL),
 * checkout via Payment Modal, error-code matrix per Contract §0.4/§5.1.
 */
export function PosScreen() {
  const toast = useToast();
  const { lines, invoiceDiscount, customer, clear, redeemPoints, parked, park, recall, dropParked } = usePosStore();
  const totals = cartTotals(lines, invoiceDiscount);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [durAlerts, setDurAlerts] = useState<DurAlert[] | null>(null);
  const [creditOverrideOpen, setCreditOverrideOpen] = useState(false);
  const [done, setDone] = useState<SaleResponse | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const sale = useMutation({
    mutationFn: (vars: PendingPayment & { override?: { alertIds: string[]; overrideToken: string } }) =>
      createSale(
        {
          shiftId: null,
          customerId: customer?.id ?? null,
          prescriptionId: null,
          lines: lines.map((l) => ({
            medicineId: l.medicine.id,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            ...(l.discount && { discount: l.discount }),
          })),
          ...(invoiceDiscount && { invoiceDiscount }),
          payment: { method: vars.method, ...(vars.installmentPlan && { installmentPlan: vars.installmentPlan }) },
          ...(vars.override && { durOverride: vars.override }),
          ...(redeemPoints > 0 && { loyaltyRedeem: { points: redeemPoints } }),
        },
        vars.override?.overrideToken,
      ),
    onSuccess: ({ data }, vars) => {
      setReceipt({
        invoiceNo: data.invoiceNo,
        createdAt: new Date().toISOString(),
        customerName: customer?.name,
        paymentMethod: vars.method,
        splits: vars.splits,
        lines: lines.map((l) => ({
          name: l.medicine.tradeNameAr,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: (Number(l.unitPrice) * l.quantity).toFixed(2),
        })),
        subtotal: totals.subtotal,
        discount: (Number(totals.lineDiscounts) + Number(totals.invoiceDiscount) + redeemValue(redeemPoints)).toFixed(2),
        total: data.total,
      });
      setDone(data);
      clear();
      setPaymentOpen(false);
      setPending(null);
      setDurAlerts(null);
      setCreditOverrideOpen(false);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiException) {
        switch (err.error.code) {
          case "DUR_BLOCK":
            setPaymentOpen(false);
            setDurAlerts((err.error.details as DurAlert[]) ?? []);
            return;
          case "CREDIT_LIMIT_EXCEEDED":
            setPaymentOpen(false);
            setCreditOverrideOpen(true);
            return;
          case "INSUFFICIENT_STOCK":
            toast("error", `الكمية غير متوفرة — ${err.error.message}`);
            return;
          case "EXPIRED_BATCH_BLOCKED":
            toast("error", "تم حظر الصرف: تشغيلة منتهية الصلاحية");
            return;
          case "PERIOD_CLOSED":
            toast("error", "الفترة المحاسبية مقفلة — راجع المالك");
            return;
          case "VALIDATION_ERROR":
            toast("error", err.error.message);
            return;
          default:
            toast("error", err.error.message);
            return;
        }
      }
      toast("warn", "تعذر الاتصال — احتُفظ بمفتاح العملية، أعد المحاولة وسيمنع التكرار تلقائياً");
    },
  });

  function openCheckout() {
    if (lines.length === 0) return toast("warn", "السلة فارغة");
    setPaymentOpen(true);
  }

  function confirmPayment(method: PaymentMethod, installmentPlan?: InstallmentPlan, splits?: { method: CheckoutMethod; amount: string }[]) {
    if (method === "CREDIT" && !customer) return toast("warn", "البيع الآجل يتطلب اختيار عميل");
    const p = { method, installmentPlan, splits };
    setPending(p);
    sale.mutate(p);
  }

  // Global F9 → checkout
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F8") { e.preventDefault(); if (lines.length) park(`معلقة ${parked.length + 1}`); }
      if (e.key === "F7") { e.preventDefault(); if (!lines.length && parked.length) recall(parked.length - 1); }
      if (e.key === "F9") {
        e.preventDefault();
        if (!paymentOpen && !done && !durAlerts) openCheckout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid grid-cols-1 gap-4 p-3 lg:h-[calc(100vh-4rem)] lg:grid-cols-12 lg:p-4">
      <section className="flex min-h-0 flex-col lg:col-span-5">
        <ProductSearch />
      </section>
      <section className="min-h-0 lg:col-span-4">
        <CartPanel />
      </section>
      <section className="min-h-0 lg:col-span-3">
        <SummaryPanel busy={sale.isPending} onCheckout={openCheckout} />
      </section>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={(Number(totals.total) - redeemValue(redeemPoints)).toFixed(4)}
        busy={sale.isPending}
        onConfirm={confirmPayment}
      />

      {/* فواتير معلقة (F8 تعليق · F7 استرجاع آخر واحدة) */}
      {parked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] font-bold text-ink-faint">معلقة:</span>
          {parked.map((pk, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1 text-xs">
              <button className="font-bold text-primary-ink disabled:opacity-40" disabled={lines.length > 0}
                title={lines.length > 0 ? "أفرغ السلة أولًا" : "استرجاع"} onClick={() => recall(i)}>
                {pk.name} <span className="num text-ink-faint">({pk.lines.length})</span>
              </button>
              <button className="text-ink-faint hover:text-danger" title="حذف" onClick={() => dropParked(i)}>×</button>
            </span>
          ))}
        </div>
      )}

      <DurDialog
        alerts={durAlerts}
        onClose={() => { setDurAlerts(null); setPending(null); }}
        onOverride={(overrideToken, alertIds) => pending && sale.mutate({ ...pending, override: { alertIds, overrideToken } })}
      />

      <PinElevateDialog
        open={creditOverrideOpen}
        onOpenChange={(o) => { setCreditOverrideOpen(o); if (!o) setPending(null); }}
        title="تجاوز حد الائتمان"
        confirmLabel="موافقة وإتمام البيع"
        description={
          customer && (
            <p className="rounded-el bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
              «{customer.name}» سيتجاوز حد الائتمان ({formatMoney(customer.creditLimit)}) بهذه العملية — يلزم موافقة صيدلي/مالك.
            </p>
          )
        }
        onToken={(token) => {
          setCreditOverrideOpen(false);
          if (pending) sale.mutate({ ...pending, override: { alertIds: [], overrideToken: token } });
        }}
      />

      {/* شريط الدفع اللاصق — موبايل فقط، فوق شريط التبويبات */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-card/95 p-2 backdrop-blur lg:hidden">
          <Button size="lg" className="w-full justify-between" onClick={() => setPaymentOpen(true)}>
            <span>إتمام البيع (F9)</span>
            <span className="num font-extrabold">{formatMoney(totals.total)}</span>
          </Button>
        </div>
      )}

      <SuccessDialog sale={done} onClose={() => setDone(null)} />
      {receipt && <Receipt data={receipt} />}
    </div>
  );
}
