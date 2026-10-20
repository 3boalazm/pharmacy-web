"use client";
import { api } from "@/lib/api/http";
import { zSaleResponse, zCreateSaleRequest } from "./schemas";
import type { CreateSaleRequest, SaleResponse } from "./types";

/**
 * POST /sales — THE atomic transaction (Contract §5.1).
 * المفتاح يُمرَّر من طبقة النية (intent) ويُعاد استخدامه في كل محاولة،
 * بدل توليده داخل الدالة (ما كان يجعل منع التكرار مستحيلًا على الخادم).
 */
export async function createSale(
  input: Omit<CreateSaleRequest, "clientSaleId" | "clientTimestamp">,
  opts: { idempotencyKey: string; overrideToken?: string },
): Promise<{ data: SaleResponse }> {
  const body = zCreateSaleRequest.parse({
    ...input,
    clientSaleId: opts.idempotencyKey,
    clientTimestamp: new Date().toISOString(),
  });
  const res = await api<SaleResponse>("/sales", {
    method: "POST",
    idempotencyKey: opts.idempotencyKey,
    overrideToken: opts.overrideToken,
    body,
  });
  if (process.env.NODE_ENV !== "production") zSaleResponse.parse(res.data);
  return res;
}
