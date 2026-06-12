export interface Medicine {
  id: string;
  tradeName: string;
  tradeNameAr: string;
  scientificName: string;
  form: string;
  company?: string;
  barcode?: string;
  internalCode: string;
  sellPrice: string;
  minStockLevel: number;
  requiresPrescription: boolean;
  isControlled: boolean;
  stock?: {
    onHand: number;
  };
}

export interface LastInvoiceLine {
  medicineId: string;
  quantity: number;
}