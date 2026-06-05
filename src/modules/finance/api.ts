"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Money } from "@/lib/utils/money";

export interface ReconciliationReport {
  trialBalanceDiff: Money;
  trialBalanceOk: boolean;
  customerBalanceDrift: { id: string; name: string; cached: Money; ledger: Money }[];
}

/** GET /finance/reconciliation/daily — trial balance + cache-drift assertions (OWNER). */
export async function getDailyReconciliation(signal?: AbortSignal) {
  return api<ReconciliationReport>("/finance/reconciliation/daily", { signal });
}
/** POST /finance/periods/:yyyymm/close — period lock (OWNER). */
export async function closePeriod(yearMonth: string) {
  return api<{ closed: string }>(`/finance/periods/${yearMonth}/close`, { method: "POST", body: {} });
}

// ───────────── الخزينة وحركة النقدية والأقساط المجمعة (الموديول المالي — Sprint 2) ─────────────

export type CashEntryType = "EXPENSE" | "INCOME" | "DEPOSIT" | "WITHDRAW";
export interface CashCategory { id: string; name: string; kind: "EXPENSE" | "INCOME" }
export interface CashEntry {
  id: string; type: CashEntryType; amount: Money; memo: string;
  category: { name: string } | null; createdBy: { name: string };
  shiftId: string | null; reversedById: string | null; reversesId: string | null;
  journalEntryId: string; createdAt: string;
}

export async function cashSummary(signal?: AbortSignal) {
  return api<{ cash: Money; bank: Money; todayExpenses: Money }>("/cash/summary", { signal });
}
export async function cashEntries(p: { type?: string; categoryId?: string; from?: string; to?: string; skip?: number }, signal?: AbortSignal) {
  return api<{ rows: CashEntry[]; total: number }>(`/cash/entries${qs({ ...p, take: 50 })}`, { signal });
}
export async function createCashEntry(input: { type: CashEntryType; amount: string; memo: string; categoryId?: string }) {
  return api<CashEntry>("/cash/entries", { method: "POST", idempotencyKey: uuidv7(), body: input });
}
export async function reverseCashEntry(id: string, reason?: string) {
  return api<CashEntry>(`/cash/entries/${id}/reverse`, { method: "POST", idempotencyKey: uuidv7(), body: { reason } });
}
export async function cashCategories(signal?: AbortSignal) {
  return api<CashCategory[]>("/cash/categories", { signal });
}

export interface InstallmentRow {
  id: string; seq: number; amount: Money; paidAmount: Money; dueDate: string;
  customer: { id: string; name: string; phone: string; balanceCached: Money } | null;
}
export async function installmentsOverview(bucket: "overdue" | "today" | "upcoming", signal?: AbortSignal) {
  return api<{ rows: InstallmentRow[]; total: Money; count: number }>(`/finance/installments${qs({ bucket })}`, { signal });
}

export interface CashFlowDay { day: string; inflow: Money; outflow: Money; overshort: Money }
export async function cashFlow(p: { from?: string; to?: string }, signal?: AbortSignal) {
  return api<{ from: string; to: string; opening: Money; days: CashFlowDay[] }>(`/finance/cash-flow${qs(p)}`, { signal });
}

/** سداد دفعة لمورد — المسار قائم في الخادم. */
export async function paySupplier(input: { supplierId: string; amount: string; memo?: string }) {
  return api<{ balanceAfter: Money }>("/finance/ap/payments", { method: "POST", idempotencyKey: uuidv7(), body: input });
}

// ───────────── تتبّع القيد + أعمار الديون (Customer Ledger completeness) ─────────────

export interface JournalEntryDetail {
  id: string; memo: string | null; sourceType: string; createdAt: string;
  lines: { id: string; debit: Money; credit: Money; account: { code: string; name: string } | null }[];
}
export async function journalEntry(id: string, signal?: AbortSignal) {
  return api<JournalEntryDetail>(`/finance/journal/${id}`, { signal });
}

export interface AgingRow {
  customerId: string; name: string; phone: string; balance: Money;
  current: Money; d30: Money; d60: Money; d90: Money; d90p: Money; unscheduled: Money;
}
export async function arAging(signal?: AbortSignal) {
  return api<{ rows: AgingRow[]; totals: Record<string, Money> | null }>("/finance/ar/aging", { signal });
}
