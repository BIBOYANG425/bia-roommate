import type { Metadata } from "next";
import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Events",
  description:
    "BIA has hosted 20+ events since 2024 for USC international students — company office tours and recruiting, startup talks, AI hackathons, tailgates, parties, and new-student meetups across LA and China.",
  alternates: { canonical: "/events" },
};

// Next up — the new-student mixer, shown prominently at the top.
const UPCOMING = {
  title: "New Student Mixer · 新生见面会",
  blurb:
    "Welcome, Trojans — meet your incoming class before you arrive on campus.",
  perks: [
    "Practical welcome pack",
    "Icebreakers & finding your people",
    "Q&A with USC upperclassmen",
    "Live DJI Pocket 4 raffle",
  ],
  sessions: [
    { city: "Beijing · 北京", when: "Jun 27 · 3:00 PM", venue: "Grand Millennium Hotel, Chaoyang" },
    { city: "Shenzhen · 深圳", when: "Jul 5 · 3:00 PM", venue: "" },
    { city: "Shanghai · 上海", when: "Jul 11 · 12:00 PM", venue: "InterContinental Jing'an" },
  ],
};

// Three flagships we have photography for — shown as featured cards.
const FEATURED = [
  {
    title: "BIA Hackathon: Build with Trae × Minimax",
    when: "Spring 2026",
    body: "Our flagship build at USC — $1,500 in prizes and a ByteDance internship track, powered by Trae and Minimax.",
    image: "/hackathon/group-photo.jpg",
  },
  {
    title: "Founders vs Investors: Roderick Dong",
    when: "Fall 2025",
    body: "A live founders-vs-investors talk with Roderick Dong — former YC China founding team, backer of five $1B+ unicorns, Forbes 30 Under 30.",
    image: "/blog-yc-china.jpg",
  },
  {
    title: "miHoYo 2026 Campus Recruiting",
    when: "Fall 2025",
    body: "An exclusive miHoYo recruiting and info session for USC students — online and in person at the Interactive Media Building.",
    image: "/blog-mihoyo.jpg",
  },
];

// Full archive, grouped by academic term (newest first). Dates as on the
// original posters; year lives in the term header.
const TERMS = [
  {
    term: "Spring 2026",
    events: [
      { date: "Mar 28", title: "BIA Hackathon · Build with Trae × Minimax", detail: "USC · $1,500 prizes + ByteDance internship" },
      { date: "Feb 20", title: "Chinese New Year Rave Night", detail: "Year of the Horse party" },
    ],
  },
  {
    term: "Fall 2025",
    events: [
      { date: "Nov 18", title: "Founders vs Investors: Roderick Dong", detail: "ex-YC China · Forbes 30 Under 30" },
      { date: "Nov", title: "UCB × USC Esports Showdown", detail: "vs UC Berkeley · livestreamed" },
      { date: "Nov 1", title: "BIA Halloween Party", detail: "Downtown LA" },
      { date: "Sep 18", title: "miHoYo 2026 Campus Recruiting", detail: "USC-exclusive session · IMB" },
      { date: "Aug 29", title: "Sunset Party @ Hope DTLA", detail: "free welcome dinner for new students" },
    ],
  },
  {
    term: "Summer 2025",
    events: [
      { date: "Aug 4", title: "Summer Enterprise Tour · Meituan", detail: "Beijing HQ office tour" },
      { date: "Jul 28", title: "Summer Enterprise Tour · Midea", detail: "Shunde office tour" },
      { date: "Jul 21", title: "Summer Enterprise Tour · Alibaba Taotian", detail: "with UC Berkeley & MIT" },
      { date: "Jul 18", title: "Summer Enterprise Tour · miHoYo", detail: "Shanghai office tour" },
      { date: "Jul 6", title: "New Student Meetup · Beijing", detail: "Kempinski Hotel" },
      { date: "Jun 29", title: "New Student Meetup · Shanghai", detail: "InterContinental Jing'an" },
    ],
  },
  {
    term: "Spring 2025",
    events: [
      { date: "Apr 4", title: "April Fools' Party", detail: "BIA 1st anniversary" },
    ],
  },
  {
    term: "Fall 2024",
    events: [
      { date: "Nov 23", title: "USC vs. UCLA Tailgate", detail: "Roadside Tacos" },
      { date: "Nov 17", title: "BIA Pool Championship", detail: "Koreatown" },
      { date: "Nov 8", title: "KPOP Random Dance", detail: "USC Village" },
      { date: "Nov 2", title: "The Duke's Macabre Banquet", detail: "Halloween party" },
      { date: "Oct 25", title: "USC vs. Rutgers Tailgate", detail: "BIA's first tailgate" },
      { date: "Oct 9", title: "BIA Movie Night", detail: "Now You See Me 2 · THH 301" },
      { date: "Sep 25", title: "Mid-Autumn Night Market", detail: "Soho Warehouse, DTLA" },
    ],
  },
  {
    term: "Summer 2024",
    events: [
      { date: "Aug 30", title: "Midsummer Madness", detail: "summer sunset party" },
      { date: "Jul 4–5", title: "New Student Meetups · China", detail: "Shenzhen & Shanghai" },
    ],
  },
];

const FORMATS = [
  {
    title: "Company tours & recruiting",
    body: "Office tours and recruiting sessions with companies across tech, gaming, and lifestyle — from miHoYo and Alibaba to Meituan and Midea — connecting members directly to opportunities.",
  },
  {
    title: "Startup & innovation talks",
    body: "Founder talks and ecosystem events exploring startups, venture, and emerging technology.",
  },
  {
    title: "AI hackathons",
    body: "Hands-on hackathons where members build real products and showcase what the community can create.",
  },
  {
    title: "Tailgates, parties & socials",
    body: "Tailgates, holiday parties, night markets, and new-student meetups — in LA and across China — that help international students find their people.",
  },
];

export default function EventsPage() {
  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />

      {/* ─── Hero (dark band) ─── */}
      <section className="bg-[#1F1F29] text-white px-6 sm:px-16 pt-36 sm:pt-44 pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#C9A96E] text-xs uppercase tracking-[0.2em] font-semibold">
            20+ events since 2024 · flagships of 300–500+
          </p>
          <h1 className="heading-serif mt-4 text-5xl sm:text-7xl leading-[0.95] text-white">
            Events
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            From recruiting sessions and office tours to hackathons, tailgates, and
            rooftop socials, BIA runs a full calendar — in LA and across China — that
            connects, grows, and celebrates USC&apos;s international student community.
          </p>
        </div>
      </section>

      {/* ─── Upcoming (light, warm gold accents) ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C9A96E]" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#C9A96E]">
              Upcoming
            </p>
          </div>
          <h2 className="heading-serif mt-3 text-4xl sm:text-5xl leading-tight text-[#171717]">
            {UPCOMING.title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#646464]">
            {UPCOMING.blurb}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {UPCOMING.perks.map((p) => (
              <span
                key={p}
                className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-1.5 text-sm font-medium text-[#171717]"
              >
                {p}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {UPCOMING.sessions.map((s) => (
              <div
                key={s.city}
                className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <p className="heading-serif text-2xl text-[#171717]">{s.city}</p>
                <p className="mt-1.5 text-sm uppercase tracking-wide font-semibold text-[#71031f]">
                  {s.when}
                </p>
                <p className="mt-2 text-base leading-6 text-[#646464]">
                  {s.venue || "Venue TBA"}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs uppercase tracking-[0.2em] font-semibold text-[#C9A96E]">
            Also coming up
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_12px_44px_rgba(0,0,0,0.10)]">
            <div>
              <p className="heading-serif text-2xl text-[#171717]">HUSH @ INS Park</p>
              <p className="mt-1 text-base text-[#646464]">INS Park, Shanghai</p>
            </div>
            <p className="shrink-0 text-sm uppercase tracking-wide font-semibold text-[#71031f]">
              Aug 3
            </p>
          </div>
        </div>
      </section>

      {/* ─── Featured ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#999]">
            Featured
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((e) => (
              <div
                key={e.title}
                className="flex flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={e.image}
                    alt={e.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs uppercase tracking-[0.12em] font-semibold text-[#71031f]">
                    {e.when}
                  </p>
                  <h3 className="heading-serif mt-2 text-xl leading-7 text-[#171717]">{e.title}</h3>
                  <p className="mt-2 text-base leading-7 text-[#646464]">{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Full timeline ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#999]">
            Every event · Summer 2024 → today
          </p>
          {TERMS.map((t) => (
            <div key={t.term} className="mt-12 first:mt-8">
              <h3 className="heading-serif text-3xl leading-tight text-[#171717]">{t.term}</h3>
              <div className="mt-4 border-t border-black/10">
                {t.events.map((e) => (
                  <div
                    key={e.title}
                    className="flex items-baseline gap-3 border-b border-black/10 py-4 sm:gap-4"
                  >
                    <span className="w-[72px] shrink-0 text-sm uppercase tracking-wide font-semibold text-[#71031f] sm:w-20">
                      {e.date}
                    </span>
                    <div className="flex-1">
                      <span className="text-lg leading-snug font-medium text-[#171717]">{e.title}</span>
                      {e.detail && (
                        <span className="ml-2 text-base text-[#646464]">— {e.detail}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── What we host ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 bg-white/40 border-y border-black/5">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#999]">
            What we host
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {FORMATS.map((f) => (
              <div
                key={f.title}
                className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_12px_44px_rgba(0,0,0,0.10)]"
              >
                <h3 className="heading-serif text-2xl text-[#171717]">{f.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#646464]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── More on the way ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16">
        <div className="max-w-3xl mx-auto rounded-[28px] border border-[#C9A96E]/30 bg-[#C9A96E]/10 p-10 text-center">
          <p className="heading-serif text-3xl text-[#171717]">More on the way</p>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#646464]">
            We&apos;re planning the next season now. Follow{" "}
            <a
              href="https://www.instagram.com/bia_usc/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#71031f] underline underline-offset-2"
            >
              @bia_usc
            </a>{" "}
            so you don&apos;t miss the next one.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
