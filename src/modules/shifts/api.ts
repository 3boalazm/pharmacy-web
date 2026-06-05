"use client";
import { api } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Money } from "@/lib/utils/money";

export interface Shift {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  openingFloat: Money;
  expectedCash: Money | null;
  countedCash: Money | null;
  overShort: Money | null;
  journalEntryId: string | null;
  user?: { name: string };
}

export async function currentShift(signal?: AbortSignal) {
  return api<{ open: boolean; shift?: Shift; liveExpected?: Money }>("/shifts/current", { signal });
}
export async function openShift(openingFloat: string) {
  return api<Shift>("/shifts/open", { method: "POST", body: { openingFloat } });
}
/** الإقفال يُرحّل قيد العجز/الزيادة تلقائيًا (Idempotency-Key). */
export async function closeShift(id: string, countedCash: string) {
  return api<Shift>(`/shifts/${id}/close`, { method: "POST", idempotencyKey: uuidv7(), body: { countedCash } });
}
export async function listShifts(signal?: AbortSignal) {
  return api<Shift[]>("/shifts", { signal });
}
