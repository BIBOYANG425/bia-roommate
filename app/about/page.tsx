import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
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
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      {/* ─── Hero (dark band) ─── */}
      <section className="relative bg-[#1F1F29] text-white px-6 sm:px-16 pt-40 pb-24 sm:pt-48 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A96E] font-semibold">
            Student-led · From USC · Est. {SITE.foundingYear}
          </p>
          <h1 className="heading-serif mt-6 text-white text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            Humanity, technology &amp; art — reshaping how young people connect, experience, and belong.
          </h1>
          <p className="mt-6 max-w-3xl text-base sm:text-lg leading-8 text-white/70 font-light">
            BIA is a student-led community starting from USC, exploring how
            humanity, technology, and art can reshape the way young people
            connect, experience, and belong.
          </p>
        </div>
      </section>

      {/* ─── The entry point ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#999] font-semibold">
            The entry point
          </p>
          <div className="mt-6 space-y-6 text-base leading-8 text-[#646464]">
            <p>
              We began with a simple observation: when someone enters a new
              school, a new city, or a new culture, what they lack is often not
              information, but a trusted way to make sense of it. There are endless
              posts, group chats, platforms, and recommendations — yet the harder
              questions remain.
            </p>
            <p className="heading-serif border-l-2 border-[#71031f] pl-6 text-xl sm:text-2xl leading-9 text-[#171717]">
              What is worth going to? Who should I meet? Where do I start? How do I
              turn a place that feels unfamiliar into a life that feels like my own?
            </p>
            <p className="heading-serif text-2xl sm:text-3xl text-[#71031f]">
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
        </div>
      </section>

      {/* ─── Three lenses ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#999] font-semibold">
            People · Technology · Art
          </p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#646464]">
            Our work sits at the intersection of people, technology, and art.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {LENSES.map((l) => (
              <div
                key={l.n}
                className="rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)] p-8"
              >
                <h3 className="heading-serif text-3xl text-[#171717]">{l.n}</h3>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#71031f] font-semibold">
                  {l.role}
                </p>
                <p className="mt-4 text-sm leading-7 text-[#646464]">{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The bigger questions ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#999] font-semibold">
            Larger than one campus
          </p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#646464]">
            BIA starts at USC, but the questions we care about are bigger.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {QUESTIONS.map((q) => (
              <div
                key={q}
                className="rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)] p-8 heading-serif text-lg sm:text-xl leading-8 text-[#171717]"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── By the numbers ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#999] font-semibold">
            By the numbers
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)] p-8"
              >
                <p className="heading-serif text-4xl sm:text-5xl text-[#171717]">{s.value}</p>
                <p className="mt-3 text-sm leading-6 text-[#646464]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing / CTA (dark band) ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-[#1F1F29] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="heading-serif text-2xl sm:text-3xl md:text-4xl leading-[1.3] text-white">
            From USC to LA, from campus life to city culture, from one gathering
            to a longer sense of belonging — BIA is here to explore what the next
            generation of community can become.
          </p>
          <Link
            href="/join"
            className="mt-10 inline-flex items-center gap-2 bg-white text-[#1F1F29] px-10 py-4 rounded-[12px] text-sm font-bold uppercase tracking-wide hover:bg-white/90 transition-all duration-200 min-h-[52px]"
          >
            Join BIA →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
