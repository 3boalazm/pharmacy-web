"use client";
import { api, qs } from "@/lib/api/http";
import type { Medicine } from "./types";

/** GET /medicines?search=&include=stock — instant search + product list (Contract §3). */
export async function searchMedicines(search: string, signal?: AbortSignal, limit = 12) {
  return api<Medicine[]>(`/medicines${qs({ search, include: "stock", limit })}`, { signal });
}
/** قائمة الأصناف لصفحة الإدارة — مع ترتيب وفلتر حالة مخزون (قراءة فقط). */
export async function listMedicines(
  params: { search?: string; sort?: string; stockStatus?: string; limit?: number },
  signal?: AbortSignal,
) {
  return api<Medicine[]>(`/medicines${qs({ include: "stock", limit: 100, ...params })}`, { signal });
}
export async function getMedicine(id: string, includeStock = false) {
  return api<Medicine>(`/medicines/${id}${includeStock ? "?include=stock" : ""}`);
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

/** GET /medicines/by-barcode/:code — بحث مباشر بالباركود للمسح الفوري (يرجّع صنفًا واحدًا بمخزونه أو يرمي 404). */
export async function lookupByBarcode(code: string, signal?: AbortSignal) {
  return api<Medicine>(`/medicines/by-barcode/${encodeURIComponent(code.trim())}`, { signal });
}
<<<<<<< HEAD
=======

>>>>>>> d0ae0c678b55c38baf69e9a8e1f2e311703cbb1e
