import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { getPublishedArticles } from "@/lib/articles";

// Public, indexable routes. Private/auth/submit routes are intentionally
// excluded here and disallowed in robots.ts.
const PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/about", priority: 0.9, changeFrequency: "monthly" },
  { path: "/team", priority: 0.8, changeFrequency: "monthly" },
  { path: "/events", priority: 0.8, changeFrequency: "weekly" },
  { path: "/sponsors", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/apartments", priority: 0.8, changeFrequency: "weekly" },
  { path: "/roommates", priority: 0.8, changeFrequency: "weekly" },
  { path: "/course-planner", priority: 0.7, changeFrequency: "monthly" },
  { path: "/course-rating", priority: 0.7, changeFrequency: "weekly" },
  { path: "/join", priority: 0.8, changeFrequency: "monthly" },
  { path: "/george", priority: 0.6, changeFrequency: "monthly" },
  { path: "/hackathon", priority: 0.6, changeFrequency: "monthly" },
  { path: "/squad", priority: 0.6, changeFrequency: "weekly" },
  { path: "/sublet", priority: 0.6, changeFrequency: "weekly" },
  { path: "/usc-group", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "daily" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getPublishedArticles();
    blogEntries = articles.map((a) => ({
      url: `${SITE.url}/blog/${encodeURIComponent(a.slug)}`,
      lastModified: a.published_at ? new Date(a.published_at) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // The sitemap must never fail the build (e.g. DB unreachable at build time);
    // fall back to the static routes only.
  }

  return [...staticEntries, ...blogEntries];
}
