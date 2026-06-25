import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth, onboarding, and submission flows carry no SEO value and may
      // expose form/query state — keep crawlers out.
      disallow: [
        "/account",
        "/onboarding",
        "/submit",
        "/sublet-submit",
        "/api/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
