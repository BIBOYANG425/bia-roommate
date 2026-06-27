import type { Metadata } from "next";
import Image from "next/image";
import MarketingShell from "@/components/MarketingShell";

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
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--cardinal)", color: "white" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>
            20+ events since 2024 · flagships of 300–500+
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[0.95] sm:text-[64px]">Events</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "rgba(255,255,255,0.85)" }}>
            From recruiting sessions and office tours to hackathons, tailgates, and
            rooftop socials, BIA runs a full calendar — in LA and across China — that
            connects, grows, and celebrates USC&apos;s international student community.
          </p>
        </div>
      </section>

      {/* Upcoming */}
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--gold)" }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--cardinal)" }}></span>
            <p className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--cardinal)" }}>
              Upcoming
            </p>
          </div>
          <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl" style={{ color: "var(--black)" }}>
            {UPCOMING.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--black)" }}>
            {UPCOMING.blurb}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {UPCOMING.perks.map((p) => (
              <span key={p} className="border-[2px] px-3 py-1 text-xs" style={{ borderColor: "var(--black)", color: "var(--black)" }}>
                {p}
              </span>
            ))}
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {UPCOMING.sessions.map((s) => (
              <div key={s.city} className="border-[3px] p-5" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
                <p className="font-display text-xl">{s.city}</p>
                <p className="mt-1 font-display text-[12px] uppercase tracking-wide" style={{ color: "var(--cardinal)" }}>
                  {s.when}
                </p>
                <p className="mt-2 text-sm leading-5" style={{ color: "var(--mid)" }}>
                  {s.venue || "Venue TBA"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Featured
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((e) => (
              <div key={e.title} className="flex flex-col border-[3px]" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
                <div className="relative aspect-[4/3] w-full overflow-hidden border-b-[3px]" style={{ borderColor: "var(--black)" }}>
                  <Image
                    src={e.image}
                    alt={e.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--cardinal)" }}>
                    {e.when}
                  </p>
                  <h3 className="mt-2 font-display text-lg leading-6">{e.title}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--mid)" }}>{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full timeline */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          Every event · Summer 2024 → today
        </h2>
        {TERMS.map((t) => (
          <div key={t.term} className="mt-10 first:mt-8">
            <h3 className="font-display text-2xl">{t.term}</h3>
            <div className="mt-3 border-t-[3px]" style={{ borderColor: "var(--black)" }}>
              {t.events.map((e) => (
                <div
                  key={e.title}
                  className="flex items-baseline gap-3 border-b py-3 sm:gap-4"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}
                >
                  <span className="w-14 shrink-0 font-display text-[11px] uppercase tracking-wide sm:w-16" style={{ color: "var(--cardinal)" }}>
                    {e.date}
                  </span>
                  <div className="flex-1">
                    <span className="font-display text-base leading-tight">{e.title}</span>
                    {e.detail && (
                      <span className="ml-2 text-sm" style={{ color: "var(--mid)" }}>
                        — {e.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* What we host */}
      <section className="border-t-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            What we host
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FORMATS.map((f) => (
              <div key={f.title} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
                <h3 className="font-display text-xl">{f.title}</h3>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's next */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="border-[3px] p-8 text-center" style={{ borderColor: "var(--black)", background: "var(--gold)" }}>
          <p className="font-display text-2xl" style={{ color: "var(--black)" }}>More on the way</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--black)" }}>
            We&apos;re planning the next season now. Follow{" "}
            <a href="https://www.instagram.com/bia_usc/" target="_blank" rel="noopener noreferrer" className="underline">
              @bia_usc
            </a>{" "}
            so you don&apos;t miss the next one.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
