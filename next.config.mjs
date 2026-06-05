/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Dev convenience: proxy to the NestJS monolith. In production the LB routes /api/v1 directly.
    return process.env.API_PROXY_TARGET
      ? [{ source: "/api/v1/:path*", destination: `${process.env.API_PROXY_TARGET}/api/v1/:path*` }]
      : [];
  },
};
export default nextConfig;
