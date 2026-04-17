import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect apex domain → www, preserving full path + query string.
      // This fixes all existing campaign email links (prismworkforce.online/set-password?token=...)
      // so contractors don't need a new email — their existing link auto-redirects to www.
      {
        source: "/:path*",
        has: [{ type: "host", value: "prismworkforce.online" }],
        destination: "https://www.prismworkforce.online/:path*",
        permanent: false, // 307 — preserves query string on redirect
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
