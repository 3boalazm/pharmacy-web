"use client";
import { create } from "zustand";
import type { Medicine } from "@/modules/catalog";
import type { Money } from "@/lib/utils/money";
import type { Discount } from "@/lib/zod/common";
import { TAX_RATE } from "./tax";

export interface CartLine {
  medicine: Medicine;
  quantity: number;
  unitPrice: Money;
  discount: Discount | null;
}
export interface CartCustomer {
  id: string;
  name: string;
  balance: Money;
  creditLimit: Money;
  loyaltyPoints: number;
}

interface PosState {
  lines: CartLine[];
  invoiceDiscount: Discount | null;
  customer: CartCustomer | null;
  prescriptionId: string | null;
  redeemPoints: number;
  parked: { name: string; lines: CartLine[]; customer: CartCustomer | null; redeemPoints: number }[]; // نقاط ولاء مستبدلة في هذه الفاتورة (1 نقطة = 0.10 ج.م)
  add: (m: Medicine) => void;
  setQty: (medicineId: string, qty: number) => void;
  setLineDiscount: (medicineId: string, d: Discount | null) => void;
  setInvoiceDiscount: (d: Discount | null) => void;
  remove: (medicineId: string) => void;
  setCustomer: (c: CartCustomer | null) => void;
  setPrescription: (id: string | null) => void;
  setRedeemPoints: (p: number) => void;
  park: (name: string) => void;
  recall: (index: number) => void;
  dropParked: (index: number) => void;
  clear: () => void;
}

export const usePosStore = create<PosState>((set) => ({
  lines: [],
  invoiceDiscount: null,
  customer: null,
  prescriptionId: null,
  redeemPoints: 0,
  parked: [],
  add: (m) =>
    set((s) => {
      const existing = s.lines.find((l) => l.medicine.id === m.id);
      if (existing) {
        return { lines: s.lines.map((l) => (l.medicine.id === m.id ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      return { lines: [...s.lines, { medicine: m, quantity: 1, unitPrice: m.sellPrice, discount: null }] };
    }),
  setQty: (id, qty) =>
    set((s) => ({ lines: s.lines.map((l) => (l.medicine.id === id ? { ...l, quantity: Math.max(1, qty) } : l)) })),
  setLineDiscount: (id, discount) =>
    set((s) => ({ lines: s.lines.map((l) => (l.medicine.id === id ? { ...l, discount } : l)) })),
  setInvoiceDiscount: (invoiceDiscount) => set({ invoiceDiscount }),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.medicine.id !== id) })),
  setCustomer: (customer) => set({ customer, redeemPoints: 0 }),
  setPrescription: (prescriptionId) => set({ prescriptionId }),
  setRedeemPoints: (redeemPoints) => set({ redeemPoints }),
  park: (name) =>
    set((s) => s.lines.length === 0 || s.parked.length >= 5 ? s : ({
      parked: [...s.parked, { name, lines: s.lines, customer: s.customer, redeemPoints: s.redeemPoints }],
      lines: [], customer: null, redeemPoints: 0, invoiceDiscount: null,
    })),
  recall: (index) =>
    set((s) => {
      const p = s.parked[index];
      if (!p || s.lines.length > 0) return s; // لا استرجاع فوق سلة بها أصناف
      return { lines: p.lines, customer: p.customer, redeemPoints: p.redeemPoints, parked: s.parked.filter((_, i) => i !== index) };
    }),
  dropParked: (index) => set((s) => ({ parked: s.parked.filter((_, i) => i !== index) })),
  clear: () => set({ lines: [], invoiceDiscount: null, customer: null, redeemPoints: 0, prescriptionId: null }),
}));

/**
 * Presentational totals ONLY — the server recomputes authoritatively (BR-3.1).
 * Cents-integer math at 4dp to avoid float drift in the preview.
 */
export function cartTotals(lines: CartLine[], invoiceDiscount: Discount | null) {
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

/** قيمة النقاط المستبدلة بالجنيه (عرض فقط — الخادم هو الحاسم). */
export const redeemValue = (points: number) => Math.round(points * 10) / 100;
