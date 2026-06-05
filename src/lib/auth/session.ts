"use client";
/**
 * Identity & Tenancy module client (API Contract §2).
 * pharmacy_id is NEVER stored or sent by the client — it lives in the JWT claims (Contract §0.1).
 */
export interface SessionUser {
  id: string;
  name: string;
  role: "OWNER" | "PHARMACIST" | "ASSISTANT" | "CASHIER";
}

const KEY = "pharmacy.session";

export function getSession(): { accessToken: string; user: SessionUser } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setSession(s: { accessToken: string; user: SessionUser }) {
  sessionStorage.setItem(KEY, JSON.stringify(s));
}
export function clearSession() {
  sessionStorage.removeItem(KEY);
}
export function hasRole(allowed: SessionUser["role"][]): boolean {
  const s = getSession();
  if (!s) return false;
  return s.user.role === "OWNER" || allowed.includes(s.user.role);
}
