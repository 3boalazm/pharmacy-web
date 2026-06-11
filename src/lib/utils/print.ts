"use client";
<<<<<<< HEAD
/** يطبع منطقة محددة (إيصال/ليبلات) بإضافة كلاس مؤقت على body ثم window.print. */
=======
/** يطبع منطقة محددة (إيصال/ليبلات/كشف) بإضافة كلاس مؤقت على body ثم window.print. */
>>>>>>> 58422b74635d4221d1b1476ea15e34090b6d3d81
export function printArea(mode: "receipt" | "labels" | "statement") {
  const cls = `printing-${mode}`;
  document.body.classList.add(cls);
  const cleanup = () => { document.body.classList.remove(cls); window.removeEventListener("afterprint", cleanup); };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 2000); // احتياط للمتصفحات التي لا تطلق afterprint
}
