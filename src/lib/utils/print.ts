"use client";
<<<<<<< HEAD
/** يطبع منطقة محددة (إيصال/ليبلات) بإضافة كلاس مؤقت على body ثم window.print. */
=======
/** يطبع منطقة محددة (إيصال/ليبلات/كشف) بإضافة كلاس مؤقت على body ثم window.print. */
>>>>>>> 8233f3233f04b1261a05c3eb8b9e24ec31ac6b26
export function printArea(mode: "receipt" | "labels" | "statement") {
  const cls = `printing-${mode}`;
  document.body.classList.add(cls);
  const cleanup = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 2000); // احتياط للمتصفحات التي لا تطلق afterprint
}
