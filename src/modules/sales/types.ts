import type { Money } from "@/lib/utils/money";

export interface InvoiceSummary {
  id: string;
  invoiceNo: string;
  customerId: string | null;
  paymentMethod: "CASH" | "CARD" | "CREDIT" | "SPLIT";
  subtotal: Money;
  totalDiscount: Money;
  total: Money;
  createdAt: string;
}
export interface InvoiceDetail extends InvoiceSummary {
  journalEntryId: string;
  lines: {
    id: string;
    medicineId: string;
    quantity: number;
    unitPrice: Money;
    discount: Money;
    lineTotal: Money;
    allocations: { batchId: string; quantity: number; unitCost: Money }[];
  }[];
}
