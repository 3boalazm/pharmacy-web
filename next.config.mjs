/** @type {import('next').NextConfig} */

// إن حُدِّد عنوان API مطلق، نضيف أصله إلى CSP تلقائيًا بدل تثبيت مضيف واحد في الكود.
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try { return new URL(raw).origin; } catch { return null; }
})();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    // لا مضيف مكتوب يدويًا: same-origin ('self') أو أصل NEXT_PUBLIC_API_BASE_URL عند البناء.
    const connectSrc = Array.from(new Set(["'self'", ...(apiOrigin ? [apiOrigin] : [])]));
    // عنوان تجميع تقارير انتهاكات CSP (اختياري): يسمح بالانتقال من المراقبة إلى الفرض بثقة.
    const reportUri = process.env.CSP_REPORT_URI;
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      // ملاحظة: 'unsafe-inline' في script-src لازم لسكربتات التمهيد المضمّنة في Next 14
      // للصفحات المبنية مسبقًا (لا يمكن توليد nonce في HTML ثابت). البديل الوحيد هو
      // rendering ديناميكي + nonce، أو ترقية Next — كلاهما خارج نطاق هذه الدفعة.
      ...(reportUri ? [`report-uri ${reportUri}`, `report-to csp-endpoint`] : []),
    ].join("; ");

    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ...(reportUri
          ? [{ key: "Reporting-Endpoints", value: `csp-endpoint="${reportUri}"` }]
          : []),
      ],
    }];
  },
  async rewrites() {
    // Dev convenience: proxy to the NestJS monolith. In production the LB routes /api/v1 directly.
    return process.env.API_PROXY_TARGET
      ? [{ source: "/api/v1/:path*", destination: `${process.env.API_PROXY_TARGET}/api/v1/:path*` }]
      : [];
  },
};
export default nextConfig;
