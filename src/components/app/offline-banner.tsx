"use client";
import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/hooks/use-online";

/**
 * شريط حقيقي لحالة الاتصال: يقول الحقيقة — البيع يتطلب اتصالًا.
 * لا يدّعي وجود طابور مزامنة غير منفذ.
 */
export function OfflineBanner() {
  const online = useOnline();
  return (
    // aria-live دائم في الشجرة: قارئ الشاشة يعلن التغيّر بدل أن يفوته ظهور/اختفاء الشريط
    <div aria-live="polite" aria-atomic="true">
      {!online && (
        <div role="status" className="flex items-center gap-2 border-b border-warn/30 bg-warn-soft px-4 py-2 text-xs font-bold text-warn">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          <span>لا يوجد اتصال بالإنترنت — البيع معطّل حتى تعود الشبكة. السلة محفوظة على هذا الجهاز.</span>
        </div>
      )}
    </div>
  );
}
