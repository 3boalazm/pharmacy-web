"use client";
import { create } from "zustand";
import type { ShopItem } from "./api";

interface CartLine { item: ShopItem; quantity: number }
interface CartState {
  lines: CartLine[];
  add: (item: ShopItem) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** سلة الستور — في الذاكرة فقط؛ الحقيقة كلها على الخادم عند الطلب. */
export const useCart = create<CartState>((set) => ({
  lines: [],
  add: (item) =>
    set((s) => {
      const ex = s.lines.find((l) => l.item.id === item.id);
      return ex
        ? { lines: s.lines.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l)) }
        : { lines: [...s.lines, { item, quantity: 1 }] };
    }),
  setQty: (id, qty) =>
    set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.item.id !== id) : s.lines.map((l) => (l.item.id === id ? { ...l, quantity: qty } : l)) })),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.item.id !== id) })),
  clear: () => set({ lines: [] }),
}));

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + Number(l.item.sellPrice) * l.quantity, 0);
