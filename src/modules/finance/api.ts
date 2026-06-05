"use client";
import { api } from "@/lib/api/http";
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
