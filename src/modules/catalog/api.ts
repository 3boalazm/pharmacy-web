"use client";
import { api, qs } from "@/lib/api/http";
import type { Medicine } from "./types";

/** GET /medicines?search=&include=stock — instant search + product list (Contract §3). */
export async function searchMedicines(search: string, signal?: AbortSignal, limit = 12) {
  return api<Medicine[]>(`/medicines${qs({ search, include: "stock", limit })}`, { signal });
}
export async function getMedicine(id: string) {
  return api<Medicine>(`/medicines/${id}`);
}
/** POST /medicines — PHARMACIST+ (Contract §3). */
export async function createMedicine(input: {
  tradeName: string; tradeNameAr: string; scientificName: string; form: string;
  company?: string; barcode?: string; internalCode: string; sellPrice: string;
  minStockLevel: number; requiresPrescription: boolean; isControlled: boolean;
}) {
  return api<Medicine>("/medicines", { method: "POST", body: input });
}

/** POST /medicines/import-base — استيراد كتالوج 1,951 صنفًا من داخل النظام (OWNER، idempotent). */
export async function importBaseCatalog() {
  return api<{ fileItems: number; inserted: number; alreadyExisted: number }>("/medicines/import-base", {
    method: "POST",
    body: {},
  });
}
