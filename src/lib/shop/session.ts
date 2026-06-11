"use client";
/** جلسة بوابة العميل — مفصولة تمامًا عن جلسة الموظفين (نطاقا ثقة مختلفان). */
export interface PortalCustomer { id: string; name: string }
const KEY = "pharmacy.portal.session";

export function getPortalSession(): { accessToken: string; customer: PortalCustomer } | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function setPortalSession(s: { accessToken: string; customer: PortalCustomer }) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
export function clearPortalSession() {
  localStorage.removeItem(KEY);
}
