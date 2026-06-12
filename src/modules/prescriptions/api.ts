"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Money } from "@/lib/utils/money";

export interface RxMedicine { id: string; tradeNameAr: string; sellPrice: Money; barcode: string | null; requiresPrescription: boolean }
export interface RxLine { id: string; medicineId: string; quantity: number; note: string | null; medicine: RxMedicine | null }
export interface Prescription {
  id: string; status: "READY" | "DISPENSED" | "CANCELLED";
  doctorName: string | null; notes: string | null; invoiceId: string | null;
  customer: { id: string; name: string } | null; customerId: string | null;
  lines: RxLine[]; createdAt: string;
}

export async function listPrescriptions(p: { status?: string; customerId?: string; skip?: number }, signal?: AbortSignal) {
  return api<{ rows: Prescription[]; total: number }>(`/prescriptions${qs(p)}`, { signal });
}
export async function createPrescription(input: {
  customerId?: string; doctorName?: string; notes?: string;
  lines: { medicineId: string; quantity: number; note?: string }[];
}) {
  return api<Prescription>("/prescriptions", { method: "POST", idempotencyKey: uuidv7(), body: input });
}
export async function cancelPrescription(id: string) {
  return api<Prescription>(`/prescriptions/${id}/cancel`, { method: "POST", idempotencyKey: uuidv7() });
}

/** تسليم الروشتة للسلة عبر sessionStorage — فك ارتباط كامل عن موديول POS. */
export const POS_HANDOFF_KEY = "pharmacy.pos.handoff";
export function handoffToPos(rx: Prescription) {
  sessionStorage.setItem(POS_HANDOFF_KEY, JSON.stringify({
    prescriptionId: rx.id,
    customerId: rx.customerId,
    lines: rx.lines
      .filter((l) => l.medicine)
      .map((l) => ({ medicine: l.medicine, quantity: l.quantity })),
  }));
}
