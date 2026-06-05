"use client";
import { api } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import { zSaleResponse, zCreateSaleRequest } from "./schemas";
import type { CreateSaleRequest, SaleResponse } from "./types";

/**
 * POST /sales — THE atomic transaction (Contract §5.1).
 * Idempotency-Key (uuidv7) mandatory; clientSaleId doubles as the offline replay key.
 * The request is Zod-validated before leaving the client; the response is Zod-parsed
 * in development as a contract-drift tripwire.
 */
export async function createSale(
  input: Omit<CreateSaleRequest, "clientSaleId" | "clientTimestamp">,
  overrideToken?: string,
): Promise<{ data: SaleResponse }> {
  const clientSaleId = uuidv7();
  const body = zCreateSaleRequest.parse({
    ...input,
    clientSaleId,
    clientTimestamp: new Date().toISOString(),
  });
  const res = await api<SaleResponse>("/sales", {
    method: "POST",
    idempotencyKey: clientSaleId,
    overrideToken,
    body,
  });
  if (process.env.NODE_ENV !== "production") zSaleResponse.parse(res.data);
  return res;
}
