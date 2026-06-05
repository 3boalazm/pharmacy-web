import type { Money } from "@/lib/utils/money";

export interface StockRow {
  medicineId: string;
  tradeNameAr: string;
  scientificName: string;
  onHand: number;
  minStockLevel: number;
  nearestExpiry: string | null;
  batchCount: number;
  status: "OK" | "LOW" | "OUT";
}
export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: Money;
  status: "ACTIVE" | "QUARANTINED" | "EXPIRED" | "DEPLETED";
  fefoOrder: number;
}
/** GRN — Contract §4. The ONLY way stock enters the system. */
export interface GrnLineInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: Money;
  bonusQuantity?: number;
}
export interface CreateGrnRequest {
  supplierId: string;
  supplierInvoiceNo: string;
  receivedAt: string;
  lines: GrnLineInput[];
  paymentTerms: "CASH" | "CREDIT";
}
export interface GrnResponse {
  grnId: string;
  journalEntryId: string; // financial fact born with the stock fact
  lines: { batchId: string }[];
}
export interface Supplier { id: string; name: string; balance: Money }
