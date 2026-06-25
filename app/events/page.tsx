import type { Metadata } from "next";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Events",
  description:
    "BIA hosts 15+ events a year for USC international students — company recruiting sessions, startup talks, AI hackathons, orientation, and socials, with flagships drawing 300–500+ attendees.",
  alternates: { canonical: "/events" },
};

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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
          What we host
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {FORMATS.map((f) => (
            <div key={f.title} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{f.body}</p>
            </div>
          ))}
        </div>

        {/* Placeholder for the real upcoming / past events list */}
        <div className="mt-10 border-[3px] border-dashed p-8 text-center" style={{ borderColor: "var(--mid)", background: "var(--cream)" }}>
          <p className="font-display text-lg">Upcoming & past events coming soon</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--mid)" }}>
            A calendar of upcoming events and a gallery of past flagships (with
            dates and photos) will live here.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
