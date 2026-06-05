"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { StockRow, Batch, CreateGrnRequest, GrnResponse, Supplier } from "./types";

export async function getStock(params: { search?: string; belowMin?: boolean; expiringWithinDays?: number }, signal?: AbortSignal) {
  return api<StockRow[]>(`/stock${qs(params)}`, { signal });
}
export async function getBatches(medicineId: string) {
  return api<Batch[]>(`/stock/${medicineId}/batches`);
}
export async function quarantineBatch(batchId: string, reason: string) {
  return api(`/batches/${batchId}/quarantine`, { method: "POST", body: { reason } });
}
/** POST /inventory/grn — Idempotency-Key mandatory (Contract §0.5). */
export async function createGrn(input: CreateGrnRequest) {
  return api<GrnResponse>("/inventory/grn", { method: "POST", idempotencyKey: uuidv7(), body: input });
}
export async function getSuppliers(search?: string) {
  return api<Supplier[]>(`/suppliers${qs({ search })}`);
}

/** POST /inventory/adjustments — WF-4 (Idempotency-Key mandatory). */
export async function createAdjustment(input: {
  batchId: string;
  quantity: number; // signed
  reason: "COUNT_CORRECTION" | "DAMAGE" | "EXPIRY_WRITE_OFF" | "THEFT" | "OTHER";
  note?: string;
}) {
  return api<{ batchId: string; newQuantity: number; journalEntryId: string }>("/inventory/adjustments", {
    method: "POST",
    idempotencyKey: uuidv7(),
    body: input,
  });
}
