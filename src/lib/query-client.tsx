"use client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ApiException } from "@/lib/api/http";
import { reportError } from "@/lib/monitoring";

/**
 * سياسة إعادة المحاولة:
 *  - 4xx: لا إعادة (خطأ قرار/صلاحية، إعادته تكرر الضجيج).
 *  - شبكة/مهلة على القراءة: محاولتان إضافيتان.
 *  - 5xx: محاولة واحدة.
 * الكتابة (mutations) لا تُعاد تلقائيًا إطلاقًا: النتيجة قد تكون غير معروفة،
 * والإعادة مسؤولية المستخدم بمفتاح idempotency نفسه.
 */
function retryPolicy(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiException) {
    if (error.status >= 400 && error.status < 500) return false;
    if (error.isNetwork) return failureCount < 2;
    return failureCount < 1;
  }
  return failureCount < 1;
}

/** سجل تشخيصي موحّد: requestId هو ما يطلبه الدعم — نُخرجه في الطرفية وفي الإشعار. */
function logApiFailure(scope: "query" | "mutation", error: unknown) {
  if (error instanceof ApiException) {
    reportError({
      kind: error.isNetwork ? "network" : scope,
      message: error.error.message,
      status: error.status,
      code: error.error.code,
      requestId: error.error.requestId,
    });
    return;
  }
  if (error instanceof Error) {
    // 4xx متوقعة لا تستحق تقريرًا (إلغاء مستخدم/تحقق) — لكن undefined شجرة يهمنا
    reportError({ kind: scope, message: error.message });
    return;
  }
  reportError({ kind: scope, message: "خطأ غير معروف" });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: retryPolicy, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
        queryCache: new QueryCache({ onError: (error) => logApiFailure("query", error) }),
        mutationCache: new MutationCache({ onError: (error) => logApiFailure("mutation", error) }),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
