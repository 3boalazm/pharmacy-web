"use client";
import { useEffect, useState } from "react";

/** حالة الاتصال الحقيقية للمتصفح — تُستخدم لمنع البيع دون اتصال بصراحة. */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    // بعض المتصفحات لا تُطلق offline عند فقدان واجهة الشبكة فقط
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
