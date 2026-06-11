"use client";
import { api, qs } from "@/lib/api/http";
import { getPortalSession } from "@/lib/shop/session";
import type { Money } from "@/lib/utils/money";

const t = () => getPortalSession()?.accessToken ?? null;

export interface ShopItem {
  id: string; tradeNameAr: string; scientificName: string; form: string;
  sellPrice: Money; requiresPrescription: boolean; available: boolean;
}
export interface PortalOrder {
  id: string; status: string; fulfillment: "PICKUP" | "DELIVERY";
  address: string | null; note: string | null; total: Money; invoiceId: string | null; createdAt: string;
  lines: { id: string; nameAr: string; quantity: number; unitPrice: Money }[];
}
export interface PortalProfile {
  id: string; name: string; phone: string;
  balance: Money; creditLimit: Money; totalPurchases: Money; loyaltyPoints: number;
  installments: { id: string; seq: number; amount: Money; dueDate: string; paidAt: string | null }[];
}

export async function portalRegister(input: { name: string; phone: string; password: string }) {
  return api<{ accessToken?: string; customer?: { id: string; name: string }; status?: string; message?: string }>(
    "/shop/auth/register", { method: "POST", body: input, token: null },
  );
}
export async function portalLogin(input: { phone: string; password: string }) {
  return api<{ accessToken: string; customer: { id: string; name: string } }>("/shop/auth/login", {
    method: "POST", body: input, token: null,
  });
}
export async function shopCatalog(search?: string, signal?: AbortSignal) {
  return api<ShopItem[]>(`/shop/catalog${qs({ search })}`, { token: null, signal });
}
export async function placeOrder(input: {
  lines: { medicineId: string; quantity: number }[];
  fulfillment: "PICKUP" | "DELIVERY"; address?: string; note?: string;
}) {
  return api<PortalOrder>("/shop/orders", { method: "POST", body: input, token: t() });
}
export async function myOrders(signal?: AbortSignal) {
  return api<PortalOrder[]>("/shop/orders", { token: t(), signal });
}
export async function myProfile(signal?: AbortSignal) {
  return api<PortalProfile>("/shop/me", { token: t(), signal });
}
export async function myStatement(signal?: AbortSignal) {
  return api<{ rows: { date: string; description: string; debit: Money | null; credit: Money | null; runningBalance: Money; journalEntryId: string }[]; closingBalance: Money }>(
    "/shop/me/statement", { token: t(), signal },
  );
}
