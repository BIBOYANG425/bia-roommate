import type { Metadata } from "next";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sponsors & Partners",
  description:
    "BIA partners with event, recruiting, local-service, and payment sponsors to serve 1,500+ USC international students. Partner with us to reach an engaged, high-intent community.",
  alternates: { canonical: "/sponsors" },
};

const CATEGORIES = [
  { title: "Event partners", body: "Brands that power our flagship events reaching 300–500+ attendees." },
  { title: "Recruiting partners", body: "Companies hiring international talent across business, entertainment, and tech." },
  { title: "Local service partners", body: "Housing, dining, and student-service providers our members rely on." },
  { title: "Payment partners", body: "Partners that make transactions and benefits seamless for members." },
];

export default function SponsorsPage() {
  return (
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Sponsors & Partners
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[0.95] sm:text-[64px]">
            Reach an engaged community
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--mid)" }}>
            BIA connects partners with {SITE.stats.members} USC international
            students and {SITE.stats.followers} social followers — a high-intent
            audience across housing, careers, and campus life.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          Partnership types
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
              <h3 className="font-display text-lg">{c.title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--mid)" }}>{c.body}</p>
            </div>
          ))}
        </div>

        {/* Placeholder for the real sponsor logo wall */}
        <div className="mt-10 border-[3px] border-dashed p-8 text-center" style={{ borderColor: "var(--mid)", background: "var(--cream)" }}>
          <p className="font-display text-lg">Partner logos coming soon</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--mid)" }}>
            A wall of our event, recruiting, and service partners will appear
            here.
          </p>
        </div>

        <div className="mt-10 border-[3px] p-8 text-center" style={{ borderColor: "var(--black)", background: "var(--gold)" }}>
          <h2 className="font-display text-2xl sm:text-3xl">Partner with BIA</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6" style={{ color: "var(--black)" }}>
            Sponsor an event, recruit our members, or reach the community.
            We&apos;ll put together a package that fits your goals.
          </p>
          <a
            href={`mailto:${SITE.email}?subject=BIA%20Partnership`}
            className="mt-5 inline-block border-[3px] px-8 py-3 font-display tracking-[0.1em] uppercase text-white"
            style={{ borderColor: "var(--black)", background: "var(--cardinal)" }}
          >
            Get in touch →
          </a>
        </div>
      </section>
    </MarketingShell>
  );
}
