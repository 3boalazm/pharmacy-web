"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Medicine } from "@/modules/catalog";
import type { Money } from "@/lib/utils/money";
import type { Discount } from "@/lib/zod/common";
import { cartTotals, maxRedeemablePoints } from "./totals";
import { stashRecovery } from "./recovery";

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

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
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
      // لا تتجاوز النقاط رصيد العميل ولا قيمة الفاتورة (منع الإجمالي السالب)
      setRedeemPoints: (p) =>
        set((s) => {
          const available = s.customer?.loyaltyPoints ?? 0;
          const max = Math.min(available, maxRedeemablePoints(cartTotals(s.lines, s.invoiceDiscount).total));
          return { redeemPoints: Math.max(0, Math.min(Math.floor(p) || 0, max)) };
        }),
      park: (name) =>
        set((s) => s.lines.length === 0 || s.parked.length >= 5 ? s : {
          parked: [...s.parked, { name, lines: s.lines, customer: s.customer, redeemPoints: s.redeemPoints }],
          lines: [], customer: null, redeemPoints: 0, invoiceDiscount: null,
        }),
      recall: (index) =>
        set((s) => {
          const p = s.parked[index];
          if (!p || s.lines.length > 0) return s; // لا استرجاع فوق سلة بها أصناف
          return { lines: p.lines, customer: p.customer, redeemPoints: p.redeemPoints, parked: s.parked.filter((_, i) => i !== index) };
        }),
      dropParked: (index) => set((s) => ({ parked: s.parked.filter((_, i) => i !== index) })),
      clear: () => set({ lines: [], invoiceDiscount: null, customer: null, redeemPoints: 0, prescriptionId: null }),
    }),
    {
      name: "pharmacy.pos.cart",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // تُحفظ بيانات السلة فقط — لا الدوال — لتبقى الفاتورة بعد تحديث/انقطاع
      partialize: (s) => ({
        lines: s.lines,
        invoiceDiscount: s.invoiceDiscount,
        customer: s.customer,
        prescriptionId: s.prescriptionId,
        redeemPoints: s.redeemPoints,
        parked: s.parked,
      }),
    },
  ),
);

// أي خروج/تسجيل دخول جديد يبدأ بسلة نظيفة على الجهاز المشترك
if (typeof window !== "undefined") {
  window.addEventListener("pharmacy:logout", () => usePosStore.getState().clear());

  // قبل مسح الحالة: نحفظ السلة غير المؤكدة (المفاتيح فقط، بلا بيانات عميل) لاستعادتها لنفس المستخدم
  window.addEventListener("pharmacy:before-logout", () => {
    try {
      stashRecovery();
    } catch {
      /* تجاهل */
    }
  });
}

/** يعيد سلة محفوظة إلى المخزن (بعد إعادة دخول نفس المستخدم خلال 30 دقيقة). */
export function restoreCart(payload: { cart: string; intent: string | null }): boolean {
  try {
    const parsed = JSON.parse(payload.cart) as { state?: Partial<PosState> } | null;
    const state = parsed?.state;
    if (!state || !Array.isArray(state.lines) || state.lines.length === 0) return false;
    usePosStore.setState({
      lines: state.lines,
      invoiceDiscount: state.invoiceDiscount ?? null,
      customer: state.customer ?? null,
      prescriptionId: state.prescriptionId ?? null,
      redeemPoints: state.redeemPoints ?? 0,
      parked: state.parked ?? [],
    });
    if (payload.intent) {
      try {
        sessionStorage.setItem("pharmacy.pos.intent", payload.intent);
      } catch {
        /* تجاهل */
      }
    }
    return true;
  } catch {
    return false;
  }
}

export { cartTotals, redeemValue, clampRedeemPoints, maxRedeemablePoints } from "./totals";
