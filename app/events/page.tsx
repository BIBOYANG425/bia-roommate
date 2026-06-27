import type { Metadata } from "next";
import Image from "next/image";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Events",
  description:
    "BIA hosts 15+ events a year for USC international students — company recruiting sessions, startup talks, AI hackathons, orientation, and socials, with flagships drawing 300–500+ attendees.",
  alternates: { canonical: "/events" },
};

// Fall 2025 → Spring 2026 season, newest first. Events with a real photo use it;
// the rest render as a brand-colored poster card (accent gradient).
const PAST_EVENTS = [
  {
    title: "BIA Hackathon: Build with Trae × Minimax",
    date: "March 28, 2026",
    meta: "$1,500 in prizes",
    body: "Our flagship build at USC — teams shipped real products with Trae and Minimax, competing for $1,500 in prizes and a ByteDance internship track.",
    image: "/hackathon/group-photo.jpg",
  },
  {
    title: "Chinese New Year Rave Night",
    date: "February 20, 2026",
    meta: "New Year party",
    body: "BIA's Lunar New Year rave — music, lights, and community to bring in the Year of the Horse.",
    accent: "linear-gradient(135deg,#8B0A2A,#C8102E)",
  },
  {
    title: "UCB × USC Esports Showdown",
    date: "November 2025",
    meta: "USC × UC Berkeley",
    body: "An inter-university esports showdown against UC Berkeley, livestreamed across three weekends in November.",
    accent: "linear-gradient(135deg,#6D28D9,#DB2777)",
  },
  {
    title: "Founders vs Investors: Roderick Dong",
    date: "November 18, 2025",
    meta: "Forbes 30 Under 30",
    body: "A live founders-vs-investors conversation with Roderick Dong (董科含) — former YC China founding team, backer of five $1B+ unicorns, Forbes 30 Under 30.",
    image: "/blog-yc-china.jpg",
  },
  {
    title: "BIA Halloween Party",
    date: "November 1, 2025",
    meta: "Downtown LA",
    body: "Games, drinks, and costumes at BIA's signature Halloween party in Downtown LA.",
    accent: "linear-gradient(135deg,#1F1F29,#7F1D1D)",
  },
  {
    title: "miHoYo 2026 Campus Recruiting",
    date: "September 18, 2025",
    meta: "USC-exclusive session",
    body: "An exclusive miHoYo campus recruiting and info session for USC students — online and in person at the Interactive Media Building.",
    image: "/blog-mihoyo.jpg",
  },
  {
    title: "Sunset Party @ Hope DTLA",
    date: "August 29, 2025",
    meta: "Free · welcome dinner",
    body: "Our welcome dinner for incoming USC students — a free rooftop sunset gathering in DTLA, the first meal of the year on us.",
    accent: "linear-gradient(135deg,#F59E0B,#EA580C)",
  },
];

const FORMATS = [
  {
    title: "Company sessions & recruiting",
    body: "Sharing sessions and recruiting events with companies across business, entertainment, and tech — connecting members directly to opportunities.",
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
    title: "Orientation & socials",
    body: "New-student orientation, parties, and community socials that help international students find their footing and their people.",
  },
];

export default function EventsPage() {
  return (
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--cardinal)", color: "white" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>
            15+ events a year · flagships of 300–500+
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[0.95] sm:text-[64px]">Events</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "rgba(255,255,255,0.85)" }}>
            From recruiting sessions to hackathons to rooftop socials, BIA runs a
            full calendar of events that connect, grow, and celebrate USC&apos;s
            international student community.
          </p>
        </div>
      </section>

      {/* Recent events — Fall 2025 → Spring 2026 */}
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Recent events · Fall 2025 – Spring 2026
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PAST_EVENTS.map((e) => (
              <div key={e.title} className="flex flex-col border-[3px]" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
                <div className="relative aspect-[4/3] w-full overflow-hidden border-b-[3px]" style={{ borderColor: "var(--black)" }}>
                  {e.image ? (
                    <Image
                      src={e.image}
                      alt={e.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-5 text-center" style={{ background: e.accent }}>
                      <span className="font-display text-xl leading-tight text-white">{e.title}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--cardinal)" }}>
                      {e.date}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--mid)" }}>{e.meta}</p>
                  </div>
                  {e.image && <h3 className="mt-2 font-display text-lg leading-6">{e.title}</h3>}
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--mid)" }}>{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we host */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
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
      </section>

      {/* What's next */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
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
