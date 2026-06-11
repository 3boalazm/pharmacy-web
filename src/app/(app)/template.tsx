"use client";

/** انتقال صفحات ناعم (fade + slide) — template يعاد تركيبه مع كل تنقّل (نمط Next الرسمي). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="slide-up">{children}</div>;
}
