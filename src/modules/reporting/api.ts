"use client";
import { api, qs } from "@/lib/api/http";
import type { Money } from "@/lib/utils/money";

export interface ReportSummary {
  from: string; to: string; invoices: number;
  salesTotal: Money; discounts: Money; cogs: Money; grossProfit: Money; returnsTotal: Money;
}
export interface DailyRow { day: string; invoices: number; total: Money; profit: Money }
export interface TopMedicine { medicineId: string; nameAr: string; form: string; quantity: number; revenue: Money }

export async function reportSummary(p: { from?: string; to?: string }, signal?: AbortSignal) {
  return api<ReportSummary>(`/reports/summary${qs(p)}`, { signal });
}
export async function reportDaily(p: { from?: string; to?: string }, signal?: AbortSignal) {
  return api<DailyRow[]>(`/reports/daily${qs(p)}`, { signal });
}
export async function reportTop(p: { from?: string; to?: string }, signal?: AbortSignal) {
  return api<TopMedicine[]>(`/reports/top-medicines${qs(p)}`, { signal });
}

/** تصدير CSV عربي-سليم (BOM لإكسل). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
