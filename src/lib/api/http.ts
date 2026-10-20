"use client";
import { getSession, clearClientState, updateTokens } from "@/lib/auth/session";
import { getDeviceId } from "@/lib/auth/device";

/** Envelope + error model per API Contract §0.3 / §0.4 */
export interface ListMeta { nextCursor?: string; limit: number; requestId: string }

/** رموز يعرفها العميل ويصرّفها في الواجهة (tuning/UX). أي رمز آخر يبقى `string` ويُعرض كما هو. */
export const KNOWN_ERROR_CODES = [
  "VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT",
  "INSUFFICIENT_STOCK", "EXPIRED_BATCH_BLOCKED", "PERIOD_CLOSED",
  "CREDIT_LIMIT_EXCEEDED", "DUR_BLOCK", "RATE_LIMITED",
  // أخطاء طبقة الشبكة (ليست من الخادم)
  "NETWORK_ERROR", "NETWORK_TIMEOUT", "BAD_RESPONSE",
] as const;
export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

export interface ApiError {
  /** `(string & {})` يمنح إكمالًا تلقائيًا للرموز المعروفة دون منع رموز الخادم الجديدة. */
  code: KnownErrorCode | (string & {});
  message: string;
  details?: unknown[];
  requestId?: string;
}
export class ApiException extends Error {
  /** ثواني الانتظار المعلنة من الخادم عند 429 (Retry-After). */
  public retryAfter?: number;
  /** true إذا كانت العملية قد تفشل بلا استجابة (شبكة/مهلة) — لا نعيد POST تلقائيًا بعدها. */
  public isNetwork = false;
  constructor(public status: number, public error: ApiError, retryAfter?: number) {
    super(error.message);
    this.retryAfter = retryAfter;
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
export const RETURN_TO_KEY = "pharmacy.returnTo";

/**
 * مهلة افتراضية لكل طلب. العمليات المالية لا يجوز أن تعلّق واجهة الكاشير للأبد،
 * لكن أي مهلة هي «نتيجة غير معروفة» وليست فشلًا — لذلك لا نعيد الإرسال تلقائيًا،
 * بل نُبقي المفتاح نفسه ليُعاد المحاولة بأمان (idempotency).
 */
const DEFAULT_TIMEOUT_MS = 20_000;
/** تقارير/تصديرات ثقيلة تحتاج وقتًا أطول — تُمرَّر صراحةً. */
export const LONG_TIMEOUT_MS = 90_000;

let lastServerTime: string | null = null;
/** ساعة الخادم كما وصلت في ترويسة HTTP Date — أدق من ساعة جهاز الكاشير. */
export function getServerTime(): string | null {
  return lastServerTime;
}

interface Opts {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string | null;
  idempotencyKey?: string;
  overrideToken?: string;
  signal?: AbortSignal;
  /** مهلة الطلب بالمللي ثانية (0 = بلا مهلة، للتصديرات الطويلة جدًا فقط). */
  timeoutMs?: number;
  /** داخلي: يمنع تكرار محاولة التجديد لنفس الطلب. */
  retried?: boolean;
}

/**
 * تجديد الجلسة — يعتمد على عقد خلفي **مفترض** (لم يُتحقق منه من الواجهة):
 *   POST /auth/refresh  { refreshToken, deviceId } → { data: { accessToken, refreshToken? } }
 * إن لم يكن الخادم يطبّقه، تفشل المحاولة بهدوء ويعود السلوك القديم (تحويل إلى /login مع returnTo).
 * الطلب الواحد يُعاد مرة واحدة فقط، وكل الطلبات المتزامنة تتشارك نفس المحاولة (single-flight)
 * حتى لا يُستهلك رمز التجديد أكثر من مرة عند فتح عدة تبويبات/استعلامات.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const session = getSession();
  if (!session?.refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken, deviceId: getDeviceId() }),
      });
      if (!res.ok) return false;
      const json = (await res.json().catch(() => null)) as
        | { data?: { accessToken?: string; refreshToken?: string } }
        | null;
      const accessToken = json?.data?.accessToken;
      if (!accessToken) return false;
      updateTokens({ accessToken, refreshToken: json?.data?.refreshToken });
      return true;
    } catch {
      return false;
    }
  })().finally(() => { refreshInFlight = null; });

  return refreshInFlight;
}

/** مسارات لا يصح فيها تجديد/تحويل: تسجيل الدخول نفسه وتسجيل الستور. */
const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register", "/shop/auth/", "/setup"];

function goToLogin(): void {
  if (typeof window === "undefined") return;
  const here = window.location.pathname + window.location.search;
  if (!here.startsWith("/login") && !here.startsWith("/setup")) {
    try { sessionStorage.setItem(RETURN_TO_KEY, here); } catch { /* تجاهل */ }
  }
  // مسح كامل: توكن + سلة/معلّقات POS + إبلاغ المتجر حتى لا يورث مستخدمٌ سلةَ مستخدمٍ آخر
  clearClientState();
  if (window.location.pathname !== "/login") window.location.href = "/login";
}

/** يدمج إلغاء المستدعي مع مهلة زمنية، ويميّز «مهلة» عن «إلغاء» في الرسائل. */
function composeSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = timeoutMs > 0
    ? setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs)
    : null;
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: ctrl.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function readRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) {
    const delta = Math.ceil((asDate - Date.now()) / 1000);
    return delta > 0 ? delta : undefined;
  }
  return undefined;
}

export async function api<T>(path: string, opts: Opts = {}): Promise<{ data: T; meta?: ListMeta }> {
  const session = getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = opts.token !== undefined ? opts.token : session?.accessToken;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.overrideToken) headers["X-Override-Approved"] = opts.overrideToken;

  const timeout = composeSignal(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: timeout.signal,
    });
  } catch (err) {
    // إلغاء المستدعي (مغادرة الصفحة/إغلاق حوار) يجب أن يمرّ كما هو ليتجاهله React Query.
    if (opts.signal?.aborted) throw err;
    const timedOut = timeout.didTimeout();
    const failure = new ApiException(0, {
      code: timedOut ? "NETWORK_TIMEOUT" : "NETWORK_ERROR",
      message: timedOut
        ? "انتهت مهلة الاتصال بالخادم — لم نتأكد من تنفيذ العملية. أعد المحاولة بنفس البيانات (محمية من التكرار)."
        : "تعذر الوصول إلى الخادم — تحقق من الشبكة. لم نتأكد من تنفيذ العملية، وأي إعادة محاولة آمنة.",
    });
    failure.isNetwork = true;
    throw failure;
  } finally {
    timeout.cleanup();
  }

  const dateHeader = res.headers.get("date");
  if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!Number.isNaN(parsed.getTime())) lastServerTime = parsed.toISOString();
  }

  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (res.status === 401) {
    const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));
    // opts.token مُمرَّر صراحةً = جلسة بوابة العميل (localStorage) وليست جلسة موظف:
    // لا تجديد ولا تحويل إلى /login، وإلا طُرد العميل إلى شاشة دخول الموظفين.
    const isEmployeeSession = opts.token === undefined;

    // تبويب آخر جدّد التوكن أثناء الطلب؟ لا نستهلك رمز التجديد مرة ثانية — نعيد بالمفتاح الجديد.
    const latestToken = getSession()?.accessToken;
    if (isEmployeeSession && !isAuthPath && !opts.retried && latestToken && latestToken !== bearer) {
      return api<T>(path, { ...opts, retried: true });
    }

    if (isEmployeeSession && !isAuthPath && !opts.retried && session?.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return api<T>(path, { ...opts, retried: true });
    }
    if (isEmployeeSession && !isAuthPath) goToLogin();
  }

  // 204 No Content: استجابة صحيحة بلا جسم (إلغاء/ack).
  if (res.status === 204) return { data: undefined as T };

  const contentType = res.headers.get("content-type") ?? "";
  const looksJson = contentType.includes("application/json") || contentType.includes("+json");
  let json: { data?: T; meta?: ListMeta; error?: ApiError } | null = null;
  if (looksJson) {
    json = await res.json().catch(() => null);
  }

  if (!res.ok) {
    // بوابة/بروكسي قد تعيد HTML أو نصًا — لا نرمي SyntaxError خامًا إلى الواجهة.
    if (!json) {
      const failure = new ApiException(res.status, {
        code: res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`,
        message: res.status === 429
          ? "محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة."
          : `فشل الطلب (${res.status}) — استجابة غير متوقعة من الخادم أو بوابة الشبكة.`,
        requestId,
      }, readRetryAfter(res));
      throw failure;
    }
    throw new ApiException(
      res.status,
      { requestId, ...json.error } as ApiError,
      readRetryAfter(res),
    );
  }

  if (!json) {
    throw new ApiException(res.status, {
      code: "BAD_RESPONSE",
      message: "استجابة غير صالحة من الخادم (ليست JSON) — لم يُعتمد نجاح العملية.",
      requestId,
    });
  }
  return { data: json.data as T, meta: json.meta };
}

export const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && s.set(k, String(v)));
  const out = s.toString();
  return out ? `?${out}` : "";
};
