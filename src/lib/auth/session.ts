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

export interface SessionPharmacy { id: string; name: string }

const KEY = "pharmacy.session";
const AUTH_CHANNEL = "pharmacy.auth";

export interface Session {
  accessToken: string;
  /** يُستخدم لتجديد التوكن دون قذف الكاشير إلى شاشة الدخول كل ١٥ دقيقة. */
  refreshToken?: string;
  user: SessionUser;
  pharmacy?: SessionPharmacy;
}
const ROLES: readonly SessionUser["role"][] = ["OWNER", "PHARMACIST", "ASSISTANT", "CASHIER"];

/**
 * التحقق من بنية الجلسة المخزّنة قبل استخدامها.
 * storage قد يحتوي JSON تالفًا (كتابة يدوية، ترقية كسرت الشكل، امتلاء أثناء الكتابة)،
 * أو كائنًا بلا توكن/دور صالح — أي منها يجب أن يُعالج كـ«لا جلسة»، لا كاستثناء يكسر الصفحة.
 */
function parseSession(raw: string): Session | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const s = parsed as Partial<Session>;
  if (typeof s.accessToken !== "string" || s.accessToken.length < 8) return null;
  if (!s.user || typeof s.user !== "object") return null;
  if (typeof s.user.id !== "string" || typeof s.user.name !== "string") return null;
  if (!ROLES.includes(s.user.role as SessionUser["role"])) return null;
  if (s.refreshToken !== undefined && typeof s.refreshToken !== "string") return null;
  if (s.pharmacy !== undefined && (typeof s.pharmacy !== "object" || typeof s.pharmacy?.id !== "string")) return null;
  return s as Session;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null; // التخزين محجوب (وضع خاص/سياسة متصفح) — نعمل كغير مسجّل
  }
  if (!raw) return null;
  const session = parseSession(raw);
  // جلسة تالفة = خطر قرارات خاطئة لاحقًا؛ نمسحها فورًا.
  if (!session) clearSession();
  return session;
}
export function setSession(s: Session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // التخزين ممتلئ/محجوب: الجلسة تبقى في الذاكرة لهذه الصفحة فقط بدل انهيار تسجيل الدخول.
    throw new Error("تعذر حفظ الجلسة على هذا المتصفح (التخزين محجوب أو ممتلئ).");
  }
}
/** تحديث التوكنات فقط مع الحفاظ على المستخدم والصيدلية. */
export function updateTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? current.refreshToken });
}
export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* تجاهل */
  }
}
export function hasRole(allowed: SessionUser["role"][]): boolean {
  const s = getSession();
  if (!s) return false;
  return s.user.role === "OWNER" || allowed.includes(s.user.role);
}

/** قناة واحدة للخروج بين التبويبات: sessionStorage لا يتزامن بينها. */
let channel: BroadcastChannel | null = null;
function authChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(AUTH_CHANNEL);
  return channel;
}

export function broadcastLogout(): void {
  try { authChannel()?.postMessage("logout"); } catch { /* تجاهل */ }
}

/** يستمع لخروج تبويب آخر. يعيد دالة إلغاء. */
export function onRemoteLogout(callback: () => void): () => void {
  const ch = authChannel();
  if (!ch) return () => undefined;
  const handler = (event: MessageEvent) => { if (event.data === "logout") callback(); };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

/** مسح كل ما يخص الجلسة على الجهاز (توكن + بيانات بيع مؤقتة) قبل تبديل المستخدم. */
export function clearClientState(): void {
  // قبل المسح: نحفظ السلة غير المؤكدة لمستخدمها حتى لا يُفقد سياق بيع محتمل (يُستعاد لنفس المستخدم فقط)
  try {
    // import دائري محتمل: نستخدم حدثًا بدل استيراد وحدة POS من طبقة الجلسة
    window.dispatchEvent(new Event("pharmacy:before-logout"));
  } catch {
    /* تجاهل */
  }
  clearSession();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("pharmacy.pos.handoff");
    sessionStorage.removeItem("pharmacy.pos.intent");
    sessionStorage.removeItem("pharmacy.pos.cart");
    sessionStorage.removeItem("pharmacy.returnTo");
  } catch {
    /* تجاهل */
  }
  // كاش الـ Service Worker قد يحمل HTML لصفحات سابقة: يُمحى عند الخروج/انتهاء الجلسة.
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
  } catch {
    /* تجاهل */
  }
  window.dispatchEvent(new Event("pharmacy:logout"));
}
