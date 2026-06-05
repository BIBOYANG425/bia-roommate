import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @biboyang425/bia-shared ships raw .ts files (no build step). Next.js
  // doesn't compile node_modules by default; transpilePackages tells it to.
  transpilePackages: ["@biboyang425/bia-shared"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // 集运/users admin retired from uscbia.com in Phase 3 — the admin now lives at
  // admin.uscbia.com. 308-redirect any old /admin bookmarks to the new app.
  // NOTE: /api/admin/me stays here (AuthProvider uses it for isAdmin) — it is
  // under /api/admin, not /admin, so this rule does not touch it.
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "https://admin.uscbia.com/admin",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "https://admin.uscbia.com/admin/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
