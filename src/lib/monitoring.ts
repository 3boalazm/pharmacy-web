"use client";

/**
 * مراقبة أخطاء الواجهة — بلا اعتماديات وبلا بيانات حساسة.
 *
 * ما يُرسل: نوع الحدث، المسار، رمز الخطأ، requestId، digest، إصدار البناء، الطابع الزمني.
 * ما لا يُرسل أبدًا: التوكن، كلمة المرور، أسماء العملاء، مبالغ، محتوى السلة.
 *
 * التشغيل: عيّن NEXT_PUBLIC_ERROR_ENDPOINT إلى نقطة تجميع (Sentry relay أو endpoint داخلي).
 * بلا متغير: تُسجَّل الأخطاء في الطرفية فقط — لا «مراقبة وهمية».
 */

const ENDPOINT = process.env.NEXT_PUBLIC_ERROR_ENDPOINT;
const RELEASE = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export interface ErrorReport {
  kind: "render" | "global" | "query" | "mutation" | "network";
  message: string;
  route?: string;
  status?: number;
  code?: string;
  requestId?: string;
  digest?: string;
}

/** قائمة سماح للحقول: أي شيء خارجها يُسقَط قبل الإرسال. */
function sanitize(r: ErrorReport): Record<string, unknown> {
  const route = typeof window !== "undefined" ? window.location.pathname : r.route;
  return {
    kind: r.kind,
    message: String(r.message).slice(0, 500),
    route,
    status: r.status,
    code: r.code,
    requestId: r.requestId,
    digest: r.digest,
    release: RELEASE,
    at: new Date().toISOString(),
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined,
  };
}

export function reportError(report: ErrorReport): void {
  const payload = sanitize(report);
  const label = `[monitor:${report.kind}]`;
  console.error(label, payload);

  if (!ENDPOINT || typeof navigator === "undefined") return;
  try {
    const body = JSON.stringify(payload);
    // sendBeacon ينجو من إغلاق الصفحة/التنقل — لا نُفقد الخطأ الأخير.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(ENDPOINT, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* المراقبة لا يجوز أن تُسقط التطبيق */
  }
}
