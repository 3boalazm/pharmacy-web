"use client";

const KEY = "pharmacy.device.id";

/**
 * معرّف جهاز دائم لهذا المتصفح.
 * كان الـ deviceId ثابتًا "web-admin" لكل المستخدمين، فكان أي ربط/تدقيق للأجهزة بلا معنى.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return "web-unknown";
  }
}
