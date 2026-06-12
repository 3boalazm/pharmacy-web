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

// ═══════════ طبقة الرؤى التحليلية (read-only) ═══════════

export interface CashVarianceRow {
  shiftId: string; user: string; closedAt: string;
  expected: string; counted: string; variance: string; variancePct: string;
  severity: "NORMAL" | "WARNING" | "CRITICAL";
}
export async function getCashVariance(signal?: AbortSignal) {
  return api<{ rows: CashVarianceRow[]; summary: { avgVariance: string; maxVariance: string; count: number } }>("/analytics/cash-variance", { signal });
}

export interface DiscountRow {
  invoiceNo: string; cashier: string; customer: string; discount: string; discountPct: string; createdAt: string; flagged: boolean;
}
export async function getDiscountAnalytics(thresholdPct: number, signal?: AbortSignal) {
  return api<{ threshold: number; flagged: DiscountRow[]; topUsers: { user: string; totalDiscount: string }[]; scanned: number }>(`/analytics/discounts${qs({ thresholdPct })}`, { signal });
}

export interface ExpiryLossRow {
  medicine: string; batchNumber: string; expiryDate: string; daysLeft: number; quantity: number; costPrice: string; potentialLoss: string;
}
export async function getExpiryLoss(withinDays: number, signal?: AbortSignal) {
  return api<{ rows: ExpiryLossRow[]; summary: { totalAtRisk: string; batches: number; withinDays: number } }>(`/analytics/expiry-loss${qs({ withinDays })}`, { signal });
}

export interface DeadStockRow {
  medicine: string; quantity: number; inventoryValue: string; lastSale: string | null; daysInactive: number | null;
}
export async function getDeadStock(inactiveDays: number, signal?: AbortSignal) {
  return api<{ rows: DeadStockRow[]; summary: { frozenValue: string; items: number; inactiveDays: number } }>(`/analytics/dead-stock${qs({ inactiveDays })}`, { signal });
}

export interface AbcRow { medicine: string; revenue: string; qty: number; revenuePct: string; cumulativePct: string; class: "A"|"B"|"C"; }
export async function getAbc(days: number, signal?: AbortSignal) {
  return api<{ rows: AbcRow[]; summary: { totalRevenue: string; counts: { A: number; B: number; C: number }; days: number } }>(`/analytics/abc${qs({ days })}`, { signal });
}

export interface SegmentRow { customer: string; invoices: number; totalSpent: string; balance: string; lastPurchase: string | null; daysSince: number | null; segment: string; }
export async function getCustomerSegments(signal?: AbortSignal) {
  return api<{ rows: SegmentRow[]; summary: { total: number; segments: Record<string, number> } }>("/analytics/customer-segments", { signal });
}

export interface StockoutRow { medicine: string; onHand: number; sold30: number; dailyRate: string; daysToStockout: number | null; minStockLevel: number; }
export async function getStockoutForecast(withinDays: number, signal?: AbortSignal) {
  return api<{ rows: StockoutRow[]; summary: { atRisk: number; withinDays: number } }>(`/analytics/stockout-forecast${qs({ withinDays })}`, { signal });
}




