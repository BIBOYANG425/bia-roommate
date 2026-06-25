// Central SEO/site config. Single source of truth for the canonical URL,
// org identity, social profiles, and the JSON-LD structured data. Reused by
// the root layout, sitemap, robots, and the legitimacy pages.
//
// Header last reviewed: 2026-06-25

export const SITE = {
  url: "https://uscbia.com",
  name: "BIA",
  fullName: "Bridging Internationals Association",
  title: "BIA | Bridging Internationals Association",
  description:
    "USC international student community — cultural bridge-building, tech & innovation, career development. Est. 2024.",
  email: "uscbia@usc.edu",
  foundingYear: "2024",
  // Only verified profiles belong here — a wrong sameAs hurts entity matching.
  // TODO: add the Xiaohongshu and WeChat Official Account URLs once confirmed.
  socials: ["https://instagram.com/bia_usc"] as string[],
  // Public, citable community metrics (kept in one place so pages stay in sync).
  stats: {
    members: "1,500+",
    followers: "3,500+",
    cohortFellows: "80+",
    eventsPerYear: "15+",
  },
} as const;

/** schema.org Organization — powers Google's entity/knowledge panel. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.fullName,
    alternateName: "BIA",
    url: SITE.url,
    logo: `${SITE.url}/icon.png`,
    email: SITE.email,
    foundingDate: SITE.foundingYear,
    description: SITE.description,
    sameAs: SITE.socials,
    location: {
      "@type": "Place",
      name: "University of Southern California",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Los Angeles",
        addressRegion: "CA",
        addressCountry: "US",
      },
    },
  };
}

/** schema.org WebSite — declares the site identity. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.fullName,
    alternateName: "BIA",
    url: SITE.url,
    inLanguage: ["zh-CN", "en-US"],
  };
}
