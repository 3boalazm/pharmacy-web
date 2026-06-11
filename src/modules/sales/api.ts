"use client";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { InvoiceDetail, InvoiceSummary } from "./types";

/** GET /sales — invoice history (Contract §5); optional customer filter feeds Purchase History. */
export async function listInvoices(params: { customerId?: string } = {}, signal?: AbortSignal) {
  return api<InvoiceSummary[]>(`/sales${qs(params)}`, { signal });
}
export async function getInvoice(id: string) {
  return api<InvoiceDetail>(`/sales/${id}`);
}

/** POST /sales/returns — WF-3 (Idempotency-Key). */
export async function createReturn(input: {
  invoiceId: string;
  reason: string;
  lines: { salesItemId: string; quantity: number }[];
}) {
  return api<{ returnId: string; refundTotal: string; refundMethod: "CASH" | "AR_CREDIT"; journalEntryId: string }>(
    "/sales/returns",
    { method: "POST", idempotencyKey: uuidv7(), body: input },
  );
}
