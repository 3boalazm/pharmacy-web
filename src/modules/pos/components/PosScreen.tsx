"use client";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePosStore, cartTotals } from "../store";
import { createSale } from "../api";
import type { DurAlert, InstallmentPlan, PaymentMethod, SaleResponse } from "../types";
import { ProductSearch } from "./ProductSearch";
import { CartPanel } from "./CartPanel";
import { SummaryPanel } from "./SummaryPanel";
import { PaymentDialog } from "./PaymentDialog";
import { DurDialog } from "./DurDialog";
import { SuccessDialog } from "./SuccessDialog";
import { PinElevateDialog } from "@/components/app/pin-elevate-dialog";
import { ApiException } from "@/lib/api/http";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";

type CheckoutMethod = Exclude<PaymentMethod, "SPLIT">;
interface PendingPayment { method: CheckoutMethod; installmentPlan?: InstallmentPlan }

/**
 * POS orchestrator — layout per the system wireframe (search · cart · summary, RTL),
 * checkout via Payment Modal, error-code matrix per Contract §0.4/§5.1.
 */
export function PosScreen() {
  const toast = useToast();
  const { lines, invoiceDiscount, customer, clear } = usePosStore();
  const totals = cartTotals(lines, invoiceDiscount);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [durAlerts, setDurAlerts] = useState<DurAlert[] | null>(null);
  const [creditOverrideOpen, setCreditOverrideOpen] = useState(false);
  const [done, setDone] = useState<SaleResponse | null>(null);

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
        },
        vars.override?.overrideToken,
      ),
    onSuccess: ({ data }) => {
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

  function confirmPayment(method: CheckoutMethod, installmentPlan?: InstallmentPlan) {
    if (method === "CREDIT" && !customer) return toast("warn", "البيع الآجل يتطلب اختيار عميل");
    const p = { method, installmentPlan };
    setPending(p);
    sale.mutate(p);
  }

  // Global F9 → checkout
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        if (!paymentOpen && !done && !durAlerts) openCheckout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-12 gap-4 p-4">
      <section className="col-span-5 flex min-h-0 flex-col">
        <ProductSearch />
      </section>
      <section className="col-span-4 min-h-0">
        <CartPanel />
      </section>
      <section className="col-span-3 min-h-0">
        <SummaryPanel busy={sale.isPending} onCheckout={openCheckout} />
      </section>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={totals.total}
        busy={sale.isPending}
        onConfirm={confirmPayment}
      />

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

      <SuccessDialog sale={done} onClose={() => setDone(null)} />
    </div>
  );
}
