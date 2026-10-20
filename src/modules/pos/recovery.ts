"use client";
import { getSession } from "@/lib/auth/session";

/**
 * استعادة «النية غير المؤكدة» بعد انتهاء الجلسة أو انقطاع الشبكة.
 *
 * المشكلة: عند 401/انقطاع لا نعرف هل وصل البيع للخادم أم لا. مسح السلة فورًا يفقد الكاشير
 * السياق، والاحتفاظ بها بلا وسم قد يُظهر سلة مستخدمٍ لمستخدمٍ آخر على جهاز مشترك.
 *
 * الحل: تُنقل السلة + مفتاح النية إلى `pharmacy.pos.recovery` موسومة بـ user.id
 * وزمن الانقطاع. الاستعادة تحدث فقط لنفس المستخدم وخلال 30 دقيقة.
 * الاستعادة لا تعيد البيع تلقائيًا — تُعيد السلة فقط، والكاشير يقرر.
 */

const RECOVERY_KEY = "pharmacy.pos.recovery";
const CART_KEY = "pharmacy.pos.cart";
const INTENT_KEY = "pharmacy.pos.intent";
const MAX_AGE_MS = 30 * 60 * 1000;

export interface Recovery {
  userId: string;
  at: number;
  cart: string;
  intent: string | null;
}

/** يُستدعى قبل مسح التخزين (خروج/401). لا يفعل شيئًا إن لم توجد سلة. */
export function stashRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    const cart = sessionStorage.getItem(CART_KEY);
    if (!cart) return;
    const userId = getSession()?.user.id;
    if (!userId) return;
    const data: Recovery = {
      userId,
      at: Date.now(),
      cart,
      intent: sessionStorage.getItem(INTENT_KEY),
    };
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(data));
  } catch {
    /* تجاهل */
  }
}

/** يُرجع السلة القابلة للاستعادة لهذا المستخدم — ويحذفها إن كانت من مستخدم آخر أو قديمة. */
export function takeRecovery(userId: string): { cart: string; intent: string | null; at: number } | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(RECOVERY_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let data: Recovery | null = null;
  try {
    data = JSON.parse(raw) as Recovery;
  } catch {
    data = null;
  }

  const valid =
    data &&
    typeof data.cart === "string" &&
    data.userId === userId &&
    typeof data.at === "number" &&
    Date.now() - data.at < MAX_AGE_MS;

  if (!valid) {
    clearRecovery();
    return null;
  }
  clearRecovery();
  return { cart: data!.cart, intent: data!.intent, at: data!.at };
}

export function clearRecovery(): void {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* تجاهل */
  }
}
