import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Bridging Internationals Association (BIA) is a USC international student community founded in 2024 — building cultural bridges, exploring technology, and supporting career growth for 1,500+ members.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    n: "01",
    title: "Cultural Bridge-Building",
    body: "Meaningful exchange between international students and American communities — helping members find belonging and build real connections at USC and beyond.",
  },
  {
    n: "02",
    title: "Technology & Innovation",
    body: "Exploring and applying cutting-edge tech trends through hackathons, company sessions, and student-built products like our course tools and George assistant.",
  },
  {
    n: "03",
    title: "Career Development",
    body: "Company sharing sessions across business, entertainment, and tech, plus resume workshops and resource matching to help members enter the U.S. workplace.",
  },
];

const STATS = [
  { value: SITE.stats.members, label: "Community members across 4 class-year groups" },
  { value: SITE.stats.followers, label: "Followers across WeChat, Xiaohongshu & Instagram" },
  { value: SITE.stats.cohortFellows, label: "Cohort fellows, selected through 4 interview rounds" },
  { value: SITE.stats.eventsPerYear, label: "Events each year, flagships drawing 300–500+" },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--cardinal)", color: "white" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>
            Est. {SITE.foundingYear} · University of Southern California
          </p>
          <h1 className="mt-4 font-display text-[44px] leading-[0.95] sm:text-[72px]">
            Bridging Internationals Association
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "rgba(255,255,255,0.85)" }}>
            BIA is a community for USC international students — a place to build
            connections, achieve growth, and find career direction. We bridge
            cultural exchange, champion technology and innovation, and give
            members hands-on support as they integrate into the American
            workplace and the global stage.
          </p>
        </div>
      </section>

      {/* By the numbers */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          By the numbers
        </h2>
        <div className="mt-6 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--black)", border: "3px solid var(--black)" }}>
          {STATS.map((s) => (
            <div key={s.label} className="p-6" style={{ background: "var(--cream)" }}>
              <p className="font-display text-4xl" style={{ color: "var(--cardinal)" }}>
                {s.value}
              </p>
              <p className="mt-2 text-sm leading-5" style={{ color: "var(--mid)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          Three pillars
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.n} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
              <p className="font-display text-3xl" style={{ color: "var(--cardinal)" }}>{p.n}</p>
              <h3 className="mt-2 font-display text-xl">{p.title}</h3>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="border-[3px] p-8 sm:p-12 text-center" style={{ borderColor: "var(--black)", background: "var(--gold)" }}>
          <h2 className="font-display text-3xl sm:text-4xl">Become part of BIA</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6" style={{ color: "var(--black)" }}>
            Join 1,500+ USC international students. Get event invites, career
            sessions, housing help, and a community that has your back.
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block border-[3px] px-8 py-3 font-display tracking-[0.1em] uppercase text-white"
            style={{ borderColor: "var(--black)", background: "var(--cardinal)" }}
          >
            Join BIA →
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
