"use client";
import { api, qs } from "@/lib/api/http";
import type { Supplier } from "./types";

export async function listSuppliers(search?: string, signal?: AbortSignal) {
  return api<Supplier[]>(`/suppliers${qs({ search })}`, { signal });
}
export async function createSupplier(input: { name: string; phone?: string }) {
  return api<Supplier>("/suppliers", { method: "POST", body: input });
}
