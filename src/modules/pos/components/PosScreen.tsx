"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePosStore, cartTotals, redeemValue, restoreCart } from "../store";
import { takeRecovery } from "../recovery";
import { getSession } from "@/lib/auth/session";
import { createSale } from "../api";
import { cartFingerprint, clearIntentKey, getIntentKey } from "../intent";
import type { DurAlert, InstallmentPlan, PaymentMethod, SaleResponse } from "../types";
import type { Medicine } from "@/modules/catalog";
import { ProductSearch } from "./ProductSearch";
import { CartPanel } from "./CartPanel";
import { SummaryPanel } from "./SummaryPanel";
import { PaymentDialog } from "./PaymentDialog";
import { DurDialog } from "./DurDialog";
import { SuccessDialog } from "./SuccessDialog";
import { Receipt, type ReceiptData } from "@/components/print/Receipt";
import { PinElevateDialog } from "@/components/app/pin-elevate-dialog";
import { ApiException, getServerTime } from "@/lib/api/http";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/hooks/use-online";
import { currentShift } from "@/modules/shifts";
import { getCustomer } from "@/modules/customers";
import { getInvoice } from "@/modules/sales";
import { formatMoney } from "@/lib/utils/money";

type CheckoutMethod = Exclude<PaymentMethod, "SPLIT">;
interface ReceiptSnapshot {
  lines: { name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  subtotal: string;
  discount: string;
  customerName?: string;
}
interface PendingPayment {
  method: PaymentMethod;
  installmentPlan?: InstallmentPlan;
  splits?: { method: CheckoutMethod; amount: string }[];
  /** لقطة السلة لحظة التأكيد — الإيصال لا يقرأ سلة قد تغيّرت أثناء الطلب */
  snapshot?: ReceiptSnapshot;
}

interface PosHandoff {
  prescriptionId: string;
  customerId: string | null;
  lines: { medicine: Medicine; quantity: number }[];
}

/**
 * POS orchestrator — layout per the system wireframe (search · cart · summary, RTL),
 * checkout via Payment Modal, error-code matrix per Contract §0.4/§5.1.
 *
 * Money safety:
 *  - الوردية المفتوحة إلزامية، ويُرسل معرّفها الحقيقي (لا null).
 *  - الدفع المقسّم يُرسل بتفصيله للخادم.
 *  - مفتاح Idempotency مشتق من محتوى السلة (نفس السلة = نفس المفتاح).
 *  - البيع دون اتصال ممنوع بصراحة (لا طابور وهمي).
 */
export function PosScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const online = useOnline();
  const { lines, invoiceDiscount, customer, clear, redeemPoints, parked, park, recall, dropParked, prescriptionId } = usePosStore();
  const totals = cartTotals(lines, invoiceDiscount);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [durAlerts, setDurAlerts] = useState<DurAlert[] | null>(null);
  const [creditOverrideOpen, setCreditOverrideOpen] = useState(false);
  const [done, setDone] = useState<SaleResponse | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [recovered, setRecovered] = useState(false);

  // الوردية: نفس مفتاح الاستعلام المستخدم في الشريط الجانبي (طلب واحد مشترك)
  const shift = useQuery({
    queryKey: ["shift", "current"],
    queryFn: async ({ signal }) => (await currentShift(signal)).data,
    refetchInterval: 30_000,
  });
  const shiftOpen = shift.data?.open === true;
  const shiftId = shiftOpen ? shift.data?.shift?.id ?? null : null;

  const sale = useMutation({
    mutationFn: (vars: PendingPayment & { override?: { alertIds: string[]; overrideToken: string } }) => {
      if (!shiftId) throw new Error("لا توجد وردية مفتوحة");
      const fingerprint = cartFingerprint({
        lines: lines.map((l) => ({
          medicineId: l.medicine.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount ? { type: l.discount.type, value: l.discount.value } : null,
        })),
        invoiceDiscount: invoiceDiscount ? { type: invoiceDiscount.type, value: invoiceDiscount.value } : null,
        customerId: customer?.id ?? null,
        prescriptionId,
        redeemPoints,
      });
      return createSale(
        {
          shiftId,
          customerId: customer?.id ?? null,
          prescriptionId,
          lines: lines.map((l) => ({
            medicineId: l.medicine.id,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            ...(l.discount && { discount: l.discount }),
          })),
          ...(invoiceDiscount && { invoiceDiscount }),
          payment: {
            method: vars.method,
            ...(vars.splits?.length ? { splits: vars.splits } : {}),
            ...(vars.installmentPlan && { installmentPlan: vars.installmentPlan }),
          },
          ...(vars.override && { durOverride: vars.override }),
          ...(redeemPoints > 0 && { loyaltyRedeem: { points: redeemPoints } }),
        },
        { idempotencyKey: getIntentKey(fingerprint), overrideToken: vars.override?.overrideToken },
      );
    },
    onSuccess: ({ data }, vars) => {
      // 1) إيصال مبدئي من لقطة لحظة التأكيد (يظهر فورًا حتى لو تعطّل جلب الفاتورة)
      const customerName = vars.snapshot?.customerName ?? customer?.name;
      setReceipt({
        invoiceNo: data.invoiceNo,
        // ساعة الخادم (ترويسة HTTP Date) أدق من ساعة جهاز الكاشير
        createdAt: getServerTime() ?? new Date().toISOString(),
        customerName,
        paymentMethod: vars.method,
        splits: vars.splits,
        lines: vars.snapshot?.lines ?? [],
        subtotal: vars.snapshot?.subtotal ?? totals.subtotal,
        discount: vars.snapshot?.discount ?? (Number(totals.lineDiscounts) + Number(totals.invoiceDiscount) + redeemValue(redeemPoints)).toFixed(2),
        total: data.total,
        verified: false,
      });

      // 2) المصدر النهائي: الفاتورة كما سجّلها الخادم (أسعار/خصومات/إجمالي/وقت).
      //    إن فشل الجلب يبقى الإيصال المبدئي موسومًا بأنه غير مصدَّق — لا نطبع أرقامًا مختلفة بصمت.
      void getInvoice(data.invoiceId)
        .then(({ data: inv }) => {
          setReceipt({
            invoiceNo: inv.invoiceNo,
            createdAt: new Date(inv.createdAt).toISOString(),
            customerName,
            paymentMethod: inv.paymentMethod,
            splits: vars.splits,
            lines: inv.lines.map((l) => ({
              name: l.nameAr ?? "صنف",
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
            subtotal: inv.subtotal,
            discount: inv.totalDiscount,
            total: inv.total,
            verified: true,
          });
        })
        .catch(() => {
          toast("warn", "تم البيع، لكن تعذر جلب نسخة الفاتورة من الخادم — الإيصال المطبوع نسخة محلية.");
        });
      setDone(data);
      clear();
      clearIntentKey();
      setPaymentOpen(false);
      setPending(null);
      setDurAlerts(null);
      setCreditOverrideOpen(false);
      qc.invalidateQueries({ queryKey: ["shift", "current"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["batches"] });
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
      if (err instanceof Error && err.message === "لا توجد وردية مفتوحة") {
        toast("warn", "افتح وردية أولًا قبل تسجيل البيع");
        return;
      }
      toast("error", "تعذر تأكيد البيع — أعد المحاولة بنفس السلة؛ العملية محمية من التكرار.");
    },
  });

  function openCheckout() {
    if (!online) return toast("error", "البيع يتطلب اتصالًا بالإنترنت — لا يوجد بيع مؤجل.");
    if (lines.length === 0) return toast("warn", "السلة فارغة");
    if (shift.isError) return toast("error", "تعذر التحقق من الوردية الحالية — أعد المحاولة.");
    if (shift.isPending) return toast("warn", "جارٍ التحقق من الوردية…");
    if (!shiftOpen || !shiftId) return toast("warn", "افتح وردية أولًا قبل تسجيل أي بيع");
    setPaymentOpen(true);
  }

  function confirmPayment(method: PaymentMethod, installmentPlan?: InstallmentPlan, splits?: { method: CheckoutMethod; amount: string }[]) {
    if (method === "CREDIT" && !customer) return toast("warn", "البيع الآجل يتطلب اختيار عميل");
    const snapshot: ReceiptSnapshot = {
      customerName: customer?.name,
      lines: lines.map((l) => ({
        name: l.medicine.tradeNameAr,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: (Number(l.unitPrice) * l.quantity).toFixed(2),
      })),
      subtotal: totals.subtotal,
      discount: (Number(totals.lineDiscounts) + Number(totals.invoiceDiscount) + redeemValue(redeemPoints)).toFixed(2),
    };
    const p = { method, installmentPlan, splits, snapshot };
    setPending(p);
    sale.mutate(p);
  }

  // استقبال روشتة من شاشة الروشتات: لا نحذف التسليم قبل التأكد من تحميله.
  const handoffBusy = useRef(false);
  const applyHandoff = useCallback(async () => {
    if (handoffBusy.current) return;
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("pharmacy.pos.handoff") : null;
    if (!raw) return;

    let h: PosHandoff;
    try {
      h = JSON.parse(raw) as PosHandoff;
    } catch {
      sessionStorage.removeItem("pharmacy.pos.handoff");
      return;
    }
    if (!h || !Array.isArray(h.lines) || h.lines.length === 0) {
      sessionStorage.removeItem("pharmacy.pos.handoff");
      return;
    }

    const st = usePosStore.getState();
    if (st.lines.length > 0) {
      toast("warn", "السلة غير فارغة — الروشتة محفوظة. أفرغ السلة ثم أعد فتح نقطة البيع.");
      return;
    }

    handoffBusy.current = true;
    try {
      for (const l of h.lines) {
        if (!l?.medicine?.id) continue;
        st.add(l.medicine);
        st.setQty(l.medicine.id, l.quantity);
      }
      st.setPrescription(h.prescriptionId);

      let linked = false;
      if (h.customerId) {
        try {
          const c = (await getCustomer(h.customerId)).data;
          st.setCustomer({ id: c.id, name: c.name, balance: c.balance, creditLimit: c.creditLimit, loyaltyPoints: c.loyaltyPoints });
          linked = true;
        } catch {
          toast("warn", "حُمّلت الروشتة، لكن تعذر ربط العميل — اختره يدويًا");
        }
      }
      sessionStorage.removeItem("pharmacy.pos.handoff");
      toast("success", linked ? "حُمّلت الروشتة والعميل — أكمل البيع" : "حُمِّلت أصناف الروشتة — أكمل البيع");
    } finally {
      handoffBusy.current = false;
    }
  }, [toast]);

  // استعادة سلة غير مؤكدة بعد انتهاء جلسة/انقطاع (نفس المستخدم فقط، خلال 30 دقيقة)
  useEffect(() => {
    const userId = getSession()?.user.id;
    if (!userId) return;
    const rec = takeRecovery(userId);
    if (!rec) return;
    if (usePosStore.getState().lines.length > 0) return; // لا نطمس سلة عاملة
    if (restoreCart(rec)) {
      setRecovered(true);
      toast("warn", "استُعيدت سلة لم يُؤكَّد بيعها. راجعها: قد تكون الفاتورة سُجّلت بالفعل — لا تكررها قبل التحقق.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void applyHandoff();
    // تسليم من تبويب آخر أثناء فتح POS
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pharmacy.pos.handoff" && e.newValue) void applyHandoff();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyHandoff]);

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
      {recovered && (
        <div className="lg:col-span-12">
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-el border border-info/30 bg-info-soft px-3 py-2 text-xs font-bold text-info">
            <span>استُعيدت سلة غير مؤكدة. تحقّق من آخر الفواتير قبل إعادة البيع — المفتاح نفسه يمنع تكرار الفاتورة تلقائيًا.</span>
            <button type="button" className="underline" onClick={() => setRecovered(false)}>إخفاء</button>
          </div>
        </div>
      )}

      {(shift.isError || (shift.isSuccess && !shiftOpen)) && (
        <div className="lg:col-span-12">
          {shift.isError ? (
            <p role="alert" className="rounded-el border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
              تعذر التحقق من الوردية الحالية — لن يُسمح بالبيع حتى يُستعاد الاتصال بالخادم.
            </p>
          ) : (
            <p role="alert" className="rounded-el border border-warn/30 bg-warn-soft px-3 py-2 text-xs font-bold text-warn">
              لا توجد وردية مفتوحة — <Link href="/shifts" className="underline">افتح وردية</Link> قبل تسجيل أي بيع، وإلا لن يُعزى النقد إلى الدرج.
            </p>
          )}
        </div>
      )}

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
          <Button size="lg" className="w-full justify-between" onClick={openCheckout} disabled={!online}>
            <span>{online ? "إتمام البيع (F9)" : "البيع يتطلب اتصالًا"}</span>
            <span className="num font-extrabold">{formatMoney(totals.total)}</span>
          </Button>
        </div>
      )}

      <SuccessDialog sale={done} onClose={() => setDone(null)} />
      {receipt && <Receipt data={receipt} />}
    </div>
  );
}
