/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // H1 — تقرير الجاهزية: CSP خط الدفاع الأول مع التوكن في sessionStorage
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://pharmacy-api-production-62be.up.railway.app",
      "frame-ancestors 'none'",
    ].join("; ");
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
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
