import type { Money } from "@/lib/utils/money";

export interface Medicine {
  id: string;
  tradeName: string;
  tradeNameAr: string;
  scientificName: string;
  form: string;
  company: string;
  barcode: string | null;
  internalCode: string;
  sellPrice: Money;
  isControlled: boolean;
  requiresPrescription: boolean;
  minStockLevel: number;
  /** present when ?include=stock — projection from Inventory, read-only */
  stock?: { onHand: number; nearestExpiry: string | null };
}
