"use client";
import { api, qs } from "@/lib/api/http";
import type { Supplier } from "./types";

export async function listSuppliers(search?: string, signal?: AbortSignal) {
  return api<Supplier[]>(`/suppliers${qs({ search })}`, { signal });
}
export async function createSupplier(input: { name: string; phone?: string }) {
  return api<Supplier>("/suppliers", { method: "POST", body: input });
}

export interface SupplierIntelItem {
  medicine: string; totalQty: number; lastPrice: string; prevPrice: string | null;
  changePct: string | null; anomaly: boolean; purchases: number;
}
export interface SupplierIntel {
  supplier: string;
  history: { invoiceCount: number; totalPurchased: string; avgInvoice: string; lastInvoiceDate: string | null };
  topItems: SupplierIntelItem[];
  anomalies: SupplierIntelItem[];
  itemsTracked: number;
  purchaseSeries: { month: string; total: string }[];
  priceSeries: { at: string; cost: string }[];
  priceSeriesItem: string | null;
}
/** GET /suppliers/:id/intelligence — ذكاء المورد (قراءة فقط). */
export async function getSupplierIntelligence(id: string, signal?: AbortSignal) {
  return api<SupplierIntel>(`/suppliers/${id}/intelligence`, { signal });
}
