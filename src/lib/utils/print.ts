"use client";
<<<<<<< HEAD
/** يطبع منطقة محددة (إيصال/ليبلات) بإضافة كلاس مؤقت على body ثم window.print. */
=======
/** يطبع منطقة محددة (إيصال/ليبلات/كشف) بإضافة كلاس مؤقت على body ثم window.print. */
>>>>>>> d0ae0c678b55c38baf69e9a8e1f2e311703cbb1e
export function printArea(mode: "receipt" | "labels" | "statement") {
  const cls = `printing-${mode}`;
  document.body.classList.add(cls);
  const cleanup = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 2000); // احتياط للمتصفحات التي لا تطلق afterprint
}
