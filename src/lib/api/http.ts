"use client";
import { getSession, clearSession } from "@/lib/auth/session";

/** Envelope + error model per API Contract §0.3 / §0.4 */
export interface ListMeta { nextCursor?: string; limit: number; requestId: string }
export interface ApiError {
  code:
    | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"
    | "INSUFFICIENT_STOCK" | "EXPIRED_BATCH_BLOCKED" | "PERIOD_CLOSED"
    | "CREDIT_LIMIT_EXCEEDED" | "DUR_BLOCK" | "RATE_LIMITED" | string;
  message: string;
  details?: unknown[];
  requestId?: string;
}
export class ApiException extends Error {
  constructor(public status: number, public error: ApiError) {
    super(error.message);
  }
}

// التعديل لضمان التوافق مع بيئة المتصفح و Vercel
const BASE = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1");

interface Opts {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string | null; 
  idempotencyKey?: string;
  overrideToken?: string; 
  signal?: AbortSignal;
}

export async function api<T>(path: string, opts: Opts = {}): Promise<{ data: T; meta?: ListMeta }> {
  const session = getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = opts.token !== undefined ? opts.token : session?.accessToken;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.overrideToken) headers["X-Override-Approved"] = opts.overrideToken;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiException(res.status, json.error ?? { code: "UNKNOWN", message: "حدث خطأ غير متوقع" });
  }
  return json as { data: T; meta?: ListMeta };
}

export const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && s.set(k, String(v)));
  const out = s.toString();
  return out ? `?${out}` : "";
};