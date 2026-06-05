import { WifiOff } from "lucide-react";

/** Precached offline fallback — shown only when a navigation has no network AND no cached copy. */
export default function OfflinePage() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center p-6">
      <div className="rise w-full max-w-sm rounded-card border border-line bg-card p-8 text-center shadow-card">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-card bg-warn-soft">
          <WifiOff className="size-7 text-warn" />
        </span>
        <h1 className="text-lg font-extrabold">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          الشاشات التي فتحتها من قبل تعمل بدون نت، وعمليات البيع تُحفَظ في طابور آمن
          وتُرحَّل تلقائيًا فور عودة الاتصال — لن تتكرر أي فاتورة.
        </p>
        <a href="/pos" className="mt-5 inline-flex h-10 items-center justify-center rounded-el bg-primary px-5 text-sm font-bold text-white hover:bg-primary-ink">
          فتح نقطة البيع
        </a>
      </div>
    </div>
  );
}
