"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { reportError } from "@/lib/monitoring";

/** حد خطأ على مستوى التطبيق — بدل شاشة بيضاء عند أي خطأ عرض. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // لا نرسل بيانات حساسة — monitoring.ts يُسقط كل حقل خارج قائمة السماح
    reportError({ kind: "render", message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-6 text-center shadow-card">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-card bg-danger-soft text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="text-lg font-extrabold">حدث خطأ غير متوقع في هذه الشاشة</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          لم تُفقد بياناتك المحفوظة على الخادم. أعد المحاولة، وإذا تكرر الخطأ فأبلغ الدعم مع رقم المرجع
          {error.digest ? <span className="num font-mono"> {error.digest}</span> : null}.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>إعادة المحاولة</Button>
          <Button variant="secondary" onClick={() => window.location.assign("/")}>لوحة التحكم</Button>
        </div>
      </div>
    </div>
  );
}
