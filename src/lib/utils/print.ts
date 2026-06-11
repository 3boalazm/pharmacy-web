"use client";
/** يطبع منطقة محددة (إيصال/ليبلات) بإضافة كلاس مؤقت على body ثم window.print. */
export function printArea(mode: "receipt" | "labels" | "statement") {
  const cls = `printing-${mode}`;
  document.body.classList.add(cls);
  const cleanup = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 2000); // احتياط للمتصفحات التي لا تطلق afterprint
}
