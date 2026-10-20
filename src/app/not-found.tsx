import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-6 text-center shadow-card">
        <p className="num text-5xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-lg font-extrabold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-ink-soft">قد يكون الرابط قديمًا أو تم نقل الشاشة.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/" className="rounded-el bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-ink">
            لوحة التحكم
          </Link>
          <Link href="/pos" className="rounded-el border border-line px-4 py-2 text-sm font-bold text-ink-soft hover:bg-paper">
            نقطة البيع
          </Link>
        </div>
      </div>
    </div>
  );
}
