"use client";
import { api, qs } from "@/lib/api/http";
import type { InvoiceDetail, InvoiceSummary } from "./types";

/** GET /sales — invoice history (Contract §5); optional customer filter feeds Purchase History. */
export async function listInvoices(params: { customerId?: string } = {}, signal?: AbortSignal) {
  return api<InvoiceSummary[]>(`/sales${qs(params)}`, { signal });
}
export async function getInvoice(id: string) {
  return api<InvoiceDetail>(`/sales/${id}`);
}
