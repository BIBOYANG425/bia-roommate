import type { Metadata } from "next";
import Image from "next/image";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Events",
  description:
    "BIA hosts 15+ events a year for USC international students — company recruiting sessions, startup talks, AI hackathons, orientation, and socials, with flagships drawing 300–500+ attendees.",
  alternates: { canonical: "/events" },
};

// TODO(showcase 2026-06-26): confirm exact dates with the team before merging to
// production. Timeframes below are placeholders kept at the semester level.
const PAST_EVENTS = [
  {
    title: "BIA Hackathon: Build with Trae & Minimax",
    timeframe: "Spring 2026",
    meta: "500+ participants",
    body: "Our flagship tech summit — teams shipped real products with cutting-edge AI tools across a packed build weekend, backed by Trae, Minimax, and partners.",
    image: "/hackathon/group-photo.jpg",
  },
  {
    title: "miHoYo Recruiting Session",
    timeframe: "Fall 2025",
    meta: "300+ attendees",
    body: "An on-campus recruiting and sharing session connecting BIA members directly with miHoYo's teams and open roles.",
    image: "/blog-mihoyo.jpg",
  },
  {
    title: "Startup 101 with YC China Founders",
    timeframe: "Fall 2025",
    meta: "Founder talk",
    body: "YC China founders on building from zero — venture, product, and the realities of starting up as an international student.",
    image: "/blog-yc-china.jpg",
  },
];

// TODO(showcase 2026-06-26): replace with the real next event + date when confirmed.
const UPCOMING = [
  {
    title: "Fall 2026 Orientation Mixer",
    date: "Date TBA",
    body: "Welcome social for incoming international students — meet your class before the semester starts.",
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
            From recruiting sessions to hackathons to orientation, BIA runs a
            full calendar of events that connect, grow, and celebrate USC&apos;s
            international student community.
          </p>
        </div>
      </section>

      {/* Upcoming */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          Upcoming
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {UPCOMING.map((e) => (
            <div key={e.title} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
              <p className="font-display text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--cardinal)" }}>
                {e.date}
              </p>
              <h3 className="mt-2 font-display text-xl">{e.title}</h3>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{e.body}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center border-[3px] border-dashed p-6" style={{ borderColor: "var(--mid)", background: "var(--cream)" }}>
            <p className="font-display text-lg">More events coming</p>
            <p className="mt-2 text-sm" style={{ color: "var(--mid)" }}>
              Follow{" "}
              <a href="https://www.instagram.com/bia_usc/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--cardinal)" }}>
                @bia_usc
              </a>{" "}
              for the next event announcement.
            </p>
          </div>
        </div>
      </section>

      {/* Past flagships */}
      <section className="border-t-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Past flagships
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PAST_EVENTS.map((e) => (
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--cardinal)" }}>
                      {e.timeframe}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--mid)" }}>{e.meta}</p>
                  </div>
                  <h3 className="mt-2 font-display text-lg leading-6">{e.title}</h3>
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
    </MarketingShell>
  );
}
