"use client";

/** يطبع منطقة محددة (إيصال/ليبلات/كشف) بإضافة كلاس مؤقت على body ثم window.print. */
export function printArea(mode: "receipt" | "labels" | "statement") {
  if (typeof window === "undefined") return;
  const cls = `printing-${mode}`;
  // لا تترك كلاس طباعة سابقًا يشوّه مستندًا جديدًا
  document.body.classList.remove("printing-receipt", "printing-labels", "printing-statement");
  document.body.classList.add(cls);
  const cleanup = () => {
    document.body.classList.remove(cls);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // احتياط طويل: 2 ثانية كانت تُزيل الأنماط قبل أن ينتهي حوار الطباعة في بعض المتصفحات
  setTimeout(cleanup, 60_000);
}