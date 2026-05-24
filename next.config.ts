import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @biboyang425/bia-shared ships raw .ts files (no build step). Next.js
  // doesn't compile node_modules by default; transpilePackages tells it to.
  transpilePackages: ["@biboyang425/bia-shared"],

  // isomorphic-dompurify (used by the shared sanitizer) pulls in jsdom, which
  // ships a CSS asset webpack can't bundle. Externalizing keeps it as a
  // runtime require for server pages; the webpack rule below silences the
  // residual CSS lookup so page-data collection doesn't fail with ENOENT.
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
  webpack: (config) => {
    config.module.rules.push({
      test: /jsdom\/lib\/jsdom\/browser\/default-stylesheet\.css$/,
      use: "null-loader",
    });
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
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
