"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Money } from "@/lib/utils/money";

export interface AdminOrder {
  id: string;
  status: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  fulfillment: "PICKUP" | "DELIVERY";
  address: string | null;
  note: string | null;
  total: Money;
  invoiceId: string | null;
  createdAt: string;
  customer: { name: string; phone: string };
  lines: { id: string; nameAr: string; quantity: number; unitPrice: Money; medicineId: string }[];
}

export async function listOrders(status?: string, signal?: AbortSignal) {
  return api<AdminOrder[]>(`/orders${qs({ status })}`, { signal });
}
export async function setOrderStatus(id: string, status: string, reason?: string) {
  return api<AdminOrder>(`/orders/${id}/status`, { method: "PATCH", body: { status, reason } });
}
/** READY → فاتورة حقيقية عبر البيع الذري (idempotent). */
export async function deliverOrder(id: string, payment: "CASH" | "CARD" | "CREDIT") {
  return api<{ invoiceId: string; invoiceNo: string; total: Money }>(`/orders/${id}/deliver`, {
    method: "POST", idempotencyKey: uuidv7(), body: { payment },
  });
}
