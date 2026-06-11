"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Customer, Statement } from "./types";
import type { Money } from "@/lib/utils/money";

export async function searchCustomers(params: { search?: string; hasDebt?: boolean }, signal?: AbortSignal) {
  return api<Customer[]>(`/customers${qs({ ...params, sort: "balance:desc" })}`, { signal });
}
export async function getCustomer(id: string) {
  return api<Customer>(`/customers/${id}`);
}
export async function createCustomer(input: { name: string; phone: string; creditLimit: Money; allergies: string[] }) {
  return api<Customer>("/customers", { method: "POST", body: input });
}
/** كشف حساب العميل — GET /finance/ar/:id/statement (the flagship screen). */
export async function getStatement(customerId: string, range?: { from?: string; to?: string }) {
  return api<Statement>(`/finance/ar/${customerId}/statement${qs(range ?? {})}`);
}
/** تسجيل دفعة — POST /finance/payments (Idempotency-Key mandatory). */
export async function recordPayment(input: { customerId: string; amount: Money; method: "CASH" | "CARD"; allocateTo: "OLDEST" }) {
  return api<{ paymentId: string; customerBalanceAfter: Money }>("/finance/payments", {
    method: "POST",
    idempotencyKey: uuidv7(),
    body: input,
  });
}

/** PATCH /customers/:id — profile fields + soft archive. Balance is never writable. */
export async function updateCustomer(
  id: string,
  input: Partial<{ name: string; phone: string; creditLimit: Money; allergies: string[]; archived: boolean; portalApproved: boolean; portalPassword: string }>,
) {
  return api<Customer>(`/customers/${id}`, { method: "PATCH", body: input });
}
