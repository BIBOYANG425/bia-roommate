import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "BIA is a student-led community starting from USC, exploring how humanity, technology, and art can reshape the way young people connect, experience, and belong.",
  alternates: { canonical: "/about" },
};

const LENSES = [
  {
    n: "Humanity",
    role: "why we exist",
    body: "We care about belonging, identity, friendship, ambition, and the emotional experience of entering a new environment.",
  },
  {
    n: "Technology",
    role: "how we imagine connection",
    body: "Not a cold tool, but a way to make discovery, recommendation, and community more personal, intuitive, and alive.",
  },
  {
    n: "Art",
    role: "how we shape experience",
    body: "From visual identity to event atmosphere, from storytelling to spatial design — the way something feels is part of what makes it matter.",
  },
];

const QUESTIONS = [
  "How do young people find their place in a new environment?",
  "How do communities form in an age of fragmented attention?",
  "How can technology make human connection warmer rather than colder?",
  "How can art turn ordinary gatherings into experiences people remember?",
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
            Student-led · From USC · Est. {SITE.foundingYear}
          </p>
          <h1 className="mt-4 font-display text-[40px] leading-[1] sm:text-[64px]">
            Humanity, technology &amp; art — reshaping how young people connect, experience, and belong.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 sm:text-lg" style={{ color: "rgba(255,255,255,0.85)" }}>
            BIA is a student-led community starting from USC, exploring how
            humanity, technology, and art can reshape the way young people
            connect, experience, and belong.
          </p>
        </div>
      </section>

      {/* The entry point */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          The entry point
        </h2>
        <div className="mt-5 space-y-5 text-base leading-7" style={{ color: "var(--black)" }}>
          <p>
            We began with a simple observation: when someone enters a new
            school, a new city, or a new culture, what they lack is often not
            information, but a trusted way to make sense of it. There are endless
            posts, group chats, platforms, and recommendations — yet the harder
            questions remain.
          </p>
          <p className="border-l-[3px] pl-5 font-display text-xl leading-8" style={{ borderColor: "var(--cardinal)" }}>
            What is worth going to? Who should I meet? Where do I start? How do I
            turn a place that feels unfamiliar into a life that feels like my own?
          </p>
          <p className="font-display text-2xl" style={{ color: "var(--cardinal)" }}>
            BIA exists to become that entry point.
          </p>
          <p>
            Rooted in the lived experience of international and Chinese-background
            students at USC, BIA is not just a social club, a tech club, or a
            traditional student organization. We are an experience-driven
            community that brings together lifestyle, creativity, technology,
            career exploration, and human connection.
          </p>
          <p>
            We care about the moments that make a new environment feel real: the
            first event where you meet people you actually want to see again, the
            conversation that changes how you think about your future, the city
            experience that makes LA feel less distant, the creative project that
            turns an idea into something visible. Community is not just about
            gathering people — it is about designing the conditions for
            meaningful encounters to happen.
          </p>
        </div>
      </section>

      {/* Three lenses */}
      <section className="border-y-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            People · Technology · Art
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--black)" }}>
            Our work sits at the intersection of people, technology, and art.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {LENSES.map((l) => (
              <div key={l.n} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
                <h3 className="font-display text-2xl">{l.n}</h3>
                <p className="mt-1 font-display text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--cardinal)" }}>
                  {l.role}
                </p>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The bigger questions */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          Larger than one campus
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--black)" }}>
          BIA starts at USC, but the questions we care about are bigger.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <div key={q} className="border-[3px] p-5 font-display text-lg leading-7" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
              {q}
            </div>
          ))}
        </div>
      </section>

      {/* By the numbers */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          By the numbers
        </h2>
        <div className="mt-6 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--black)", border: "3px solid var(--black)" }}>
          {STATS.map((s) => (
            <div key={s.label} className="p-6" style={{ background: "var(--cream)" }}>
              <p className="font-display text-4xl" style={{ color: "var(--cardinal)" }}>{s.value}</p>
              <p className="mt-2 text-sm leading-5" style={{ color: "var(--mid)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing / CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="border-[3px] p-8 sm:p-12" style={{ borderColor: "var(--black)", background: "var(--gold)" }}>
          <p className="max-w-3xl font-display text-2xl leading-9 sm:text-3xl" style={{ color: "var(--black)" }}>
            From USC to LA, from campus life to city culture, from one gathering
            to a longer sense of belonging — BIA is here to explore what the next
            generation of community can become.
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
