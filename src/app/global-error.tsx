"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

/** آخر خط دفاع: خطأ في الشجرة الجذرية (يشمل layout). يجب أن يعرّف html/body بنفسه. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError({ kind: "global", message: error.message, digest: error.digest });
  }, [error]);
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "Cairo, system-ui, sans-serif", background: "#f4f6f3", margin: 0 }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 440, background: "#fff", border: "1px solid #e3e8e2", borderRadius: 12, padding: 24, textAlign: "center" }}>
            <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>تعذر تحميل التطبيق</h1>
            <p style={{ fontSize: 14, color: "#46554c", lineHeight: 1.7, margin: "0 0 16px" }}>
              حدث خطأ في تحميل الواجهة. أعد المحاولة، وإذا استمرت المشكلة فأبلغ الدعم.
              {error.digest ? <span style={{ fontFamily: "monospace" }}> ({error.digest})</span> : null}
            </p>
            <button
              onClick={reset}
              style={{ background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
            >
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
