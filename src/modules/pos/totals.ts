import type { Discount } from "@/lib/zod/common";
import type { Money } from "@/lib/utils/money";
import { TAX_RATE } from "./tax";

/** الحد الأدنى لشكل السطر الذي يحتاجه الحساب — يفصل الحساب عن Zustand ليكون قابلًا للاختبار. */
export interface TotalsLine {
  unitPrice: Money | string;
  quantity: number;
  discount: Discount | null;
}

/**
 * Presentational totals ONLY — the server recomputes authoritatively (BR-3.1).
 * Cents-integer math at 4dp to avoid float drift in the preview.
 */
export function cartTotals(lines: TotalsLine[], invoiceDiscount: Discount | null) {
  const toC = (v: string | number) => Math.round(Number(v) * 10_000);
  let subtotalC = 0;
  let lineDiscC = 0;
  for (const l of lines) {
    const grossC = toC(l.unitPrice) * l.quantity;
    subtotalC += grossC;
    if (l.discount) {
      lineDiscC += l.discount.type === "PERCENT" ? Math.round((grossC * Number(l.discount.value)) / 100) : toC(l.discount.value);
    }
  }
  const baseC = subtotalC - lineDiscC;
  const invDiscC = invoiceDiscount
    ? invoiceDiscount.type === "PERCENT"
      ? Math.round((baseC * Number(invoiceDiscount.value)) / 100)
      : toC(invoiceDiscount.value)
    : 0;
  const netC = Math.max(0, baseC - invDiscC);
  const taxC = Math.round(netC * TAX_RATE);
  const fmt = (c: number) => (c / 10_000).toFixed(4);
  return {
    subtotal: fmt(subtotalC),
    lineDiscounts: fmt(lineDiscC),
    invoiceDiscount: fmt(invDiscC),
    totalDiscount: fmt(lineDiscC + invDiscC),
    net: fmt(netC),
    tax: fmt(taxC),
    total: fmt(netC + taxC),
  };
}

/** قيمة النقاط المستبدلة بالجنيه (عرض فقط — الخادم هو الحاسم). 1 نقطة = 0.10 ج.م */
export const redeemValue = (points: number) => Math.round(points * 10) / 100;

/** أقصى عدد نقاط يمكن استبداله دون أن يصبح إجمالي الفاتورة سالبًا. */
export function maxRedeemablePoints(invoiceTotal: string | number): number {
  const total = Number(invoiceTotal);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total * 10 + 1e-9);
}

/** يقصّ النقاط بحدود رصيد العميل وقيمة الفاتورة معًا. */
export function clampRedeemPoints(points: number, availablePoints: number, invoiceTotal: string | number): number {
  const safePoints = Number.isFinite(points) ? Math.floor(points) : 0;
  return Math.max(0, Math.min(safePoints, Math.max(0, Math.floor(availablePoints)), maxRedeemablePoints(invoiceTotal)));
}
