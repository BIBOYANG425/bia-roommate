import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "George Tirebiter · BIA AI Companion",
  description:
    "USC's campus ghost dog, now in AI form. Ask George anything about events, courses, housing, and campus life.",
};

const CAPABILITIES = [
  {
    tag: "Events",
    title: "Find what's happening this week",
    summary:
      "George surfaces every BIA, USC, and community event near you, filtered by what you actually care about.",
    bullets: [
      "BIA, USC, and community events in one feed",
      "Filter by interest, set reminders, get RSVP links",
      "Never miss the events that matter to you",
    ],
    accent: "bg-[#A0D7D1]",
  },
  {
    tag: "Courses",
    title: "Pick courses you won't regret",
    summary:
      "Real reviews from BIA cohort fellows, real ratings from RateMyProfessors, and real schedule conflict checks.",
    bullets: [
      "Pull RateMyProfessors ratings and peer reviews",
      "Check schedule conflicts before WebReg opens",
      "Get course recommendations matched to your interests",
    ],
    accent: "bg-[#FCD9B4]",
  },
  {
    tag: "Housing",
    title: "Find a roommate or sublet, fast",
    summary:
      "Pre-vetted BIA roommate profiles and student-posted sublets, surfaced by the habits and budget you describe.",
    bullets: [
      "Pre-vetted BIA roommate profiles, filtered by habits",
      "Student-posted sublet leads near campus",
      "Tell George what you need and he filters for you",
    ],
    accent: "bg-[#E8C5DA]",
  },
  {
    tag: "Social",
    title: "Meet people who actually fit",
    summary:
      "Connections by major, cohort year, and shared interests. Especially helpful if you just got to USC and don't know anyone yet.",
    bullets: [
      "Find study buddies, project teammates, and hackathon partners",
      "Connections by major, cohort, and shared interests",
      "Built for first-semester international students",
    ],
    accent: "bg-[#C5D7E8]",
  },
  {
    tag: "Campus",
    title: "Insider tips only locals know",
    summary:
      "Late-night food, quiet study spots, transit shortcuts. The stuff upperclassmen wish they had known earlier.",
    bullets: [
      "Study spots, late-night food, transit shortcuts",
      "K-Town favorites and USC dining tips",
      "Built on real experience from BIA upperclassmen",
    ],
    accent: "bg-[#D7E8C5]",
  },
];

const EXAMPLE_PROMPTS = [
  "What's happening on campus this weekend?",
  "I'm thinking about CSCI 270 next semester, is it worth it?",
  "Looking for a quiet study spot near Leavey, any ideas?",
  "Help me find a roommate who isn't a night owl.",
  "Where's the best late-night Chinese food in K-Town?",
  "Set a reminder for the BIA hackathon kickoff.",
];

const CHANNELS = [
  {
    name: "Web Chat",
    desc: "Talk to George right here on uscbia.com. A small group of testers is helping us shake out the rough edges before we open it to everyone.",
    status: "Beta",
    statusStyle: "bg-[#FCD9B4] text-[#7A3D0A]",
    href: "/george/chat" as const,
    cta: "Try the preview →",
  },
  {
    name: "iMessage",
    desc: "Text George like a friend. He keeps your context across days. Currently in private beta with a small group of BIA members.",
    status: "Beta · Waitlist",
    statusStyle: "bg-[#A0D7D1] text-[#1F1F29]",
    href: "https://forms.gle/qZfbiKdmasN6jid5A" as const,
    cta: "Join the waitlist →",
    external: true,
  },
  {
    name: "WeChat",
    desc: "Reply with your question inside the BIA Official Account. George answers in the same thread.",
    status: "Coming soon",
    statusStyle: "bg-zinc-200 text-zinc-700",
    href: null,
    cta: "Coming soon",
  },
];

export default function GeorgePage() {
  return (
    <div className="min-h-screen bg-[#F9FAF7] text-[#171717] font-sans">
      {/* Top bar */}
      <nav className="border-b border-black/5 bg-[#F9FAF7]/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.18em] text-[#6B7280] hover:text-[#171717] transition-colors"
          >
            ← uscbia.com
          </Link>
          <Link
            href="/george/chat"
            className="text-xs uppercase tracking-[0.18em] font-semibold text-[#171717] hover:text-[#8B0A2A] transition-colors"
          >
            Try George →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8B0A2A] font-semibold mb-6">
              BIA AI Companion
            </p>
            <h1 className="heading-serif text-5xl sm:text-6xl md:text-7xl leading-[0.95] mb-6 text-[#171717]">
              Meet George.
              <br />
              <span className="text-[#8B0A2A]">USC’s ghost dog,</span> now in AI.
            </h1>
            <p className="text-lg sm:text-xl text-[#3F3F46] leading-relaxed max-w-xl mb-8">
              George Tirebiter has wandered USC since the 1940s. He’s still the
              same campus ghost dog. Now you can actually ask him things.
            </p>
            <p className="text-base text-[#52525B] leading-relaxed max-w-xl mb-10">
              Events, courses, housing, social connections, and campus life
              tips. Ask him anything, in plain English. He’ll answer like a
              friend who’s been here a while.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/george/chat"
                className="group inline-flex items-center gap-3 bg-[#171717] text-white px-8 py-4 rounded-[12px] hover:bg-[#2C2C2C] transition-all duration-200 font-bold text-sm tracking-wide uppercase shadow-lg"
              >
                Try George
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href="#capabilities"
                className="text-sm uppercase tracking-[0.18em] font-semibold text-[#171717] hover:text-[#8B0A2A] transition-colors"
              >
                What he can do ↓
              </a>
            </div>
          </div>

          {/* Mascot card */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[#8B0A2A] to-[#71031f] rounded-[2rem] p-10 shadow-2xl flex flex-col items-center justify-center text-white text-center">
              <div className="text-[140px] sm:text-[180px] leading-none mb-4">
                👻🐕
              </div>
              <div className="text-sm uppercase tracking-[0.2em] opacity-80 mb-2">
                George Tirebiter
              </div>
              <div className="heading-serif text-2xl opacity-90">
                The Campus Ghost
              </div>
              <div className="mt-6 text-xs opacity-75 font-mono">
                est. 1940s · USC
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-[#FCD9B4] text-[#7A3D0A] px-4 py-2 rounded-full text-xs uppercase tracking-widest font-bold shadow-md">
              In Beta
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="bg-[#FEFFFC] border-y border-black/5"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mb-16 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8B0A2A] font-semibold mb-4">
              What he does
            </p>
            <h2 className="heading-serif text-4xl sm:text-5xl mb-4 text-[#171717] leading-tight">
              Five things George does well.
            </h2>
            <p className="text-lg text-[#6B7280] leading-relaxed">
              Each capability is a real specialist, with its own tools and its
              own data. George routes your question to the right one
              automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.tag}
                className="group bg-white rounded-[1.5rem] p-8 border border-black/5 hover:border-black/15 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="text-xs uppercase tracking-[0.18em] font-bold text-[#171717]">
                    {cap.tag}
                  </span>
                  <span
                    className={`h-3 w-3 rounded-full ${cap.accent} group-hover:scale-150 transition-transform duration-300`}
                  />
                </div>
                <h3 className="heading-serif text-2xl sm:text-3xl mb-4 text-[#171717] leading-tight">
                  {cap.title}
                </h3>
                <p className="text-[#52525B] mb-6 text-base leading-relaxed">
                  {cap.summary}
                </p>
                <ul className="space-y-2 mt-auto">
                  {cap.bullets.map((b) => (
                    <li
                      key={b}
                      className="text-sm text-[#3F3F46] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-px before:bg-[#171717]"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Try saying */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8B0A2A] font-semibold mb-4">
            Examples
          </p>
          <h2 className="heading-serif text-4xl sm:text-5xl mb-4 text-[#171717] leading-tight">
            Try saying something like this.
          </h2>
          <p className="text-lg text-[#6B7280] leading-relaxed">
            Plain English works. You don’t need to phrase anything in a special
            way.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <div
              key={prompt}
              className="bg-white rounded-[1rem] p-6 border border-black/10 hover:border-[#8B0A2A]/40 transition-colors duration-200"
              style={{
                transform: `rotate(${i % 2 === 0 ? "-0.4deg" : "0.4deg"})`,
              }}
            >
              <div className="text-xs uppercase tracking-widest text-[#8B0A2A] font-bold mb-3">
                Q{(i + 1).toString().padStart(2, "0")}
              </div>
              <p className="text-base text-[#171717] leading-snug font-medium">
                “{prompt}”
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/george/chat"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] font-bold text-[#8B0A2A] hover:text-[#71031f] transition-colors"
          >
            Or just ask your own thing
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Channels */}
      <section className="bg-[#171717] text-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mb-16 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[#A0D7D1] font-semibold mb-4">
              Where to find him
            </p>
            <h2 className="heading-serif text-4xl sm:text-5xl mb-4 leading-tight">
              Three places to chat with George.
            </h2>
            <p className="text-lg text-white/60 leading-relaxed">
              Web and iMessage are in private beta today. WeChat opens next.
              Sign up for the waitlist and we’ll let you in as fast as we can.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CHANNELS.map((ch) => (
              <div
                key={ch.name}
                className="bg-white/5 border border-white/10 rounded-[1.5rem] p-8 flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="text-lg font-bold">{ch.name}</div>
                  <span
                    className={`text-[10px] uppercase tracking-widest font-bold rounded-full px-3 py-1 ${ch.statusStyle}`}
                  >
                    {ch.status}
                  </span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed mb-8">
                  {ch.desc}
                </p>
                <div className="mt-auto">
                  {ch.href ? (
                    ch.external ? (
                      <a
                        href={ch.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#A0D7D1] text-[#1F1F29] px-6 py-3 rounded-[10px] font-bold text-sm uppercase tracking-wide hover:bg-white transition-colors"
                      >
                        {ch.cta}
                      </a>
                    ) : (
                      <Link
                        href={ch.href}
                        className="inline-flex items-center gap-2 bg-[#A0D7D1] text-[#1F1F29] px-6 py-3 rounded-[10px] font-bold text-sm uppercase tracking-wide hover:bg-white transition-colors"
                      >
                        {ch.cta}
                      </Link>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-2 text-white/40 text-sm uppercase tracking-wide font-bold">
                      {ch.cta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Under the hood */}
      <section className="bg-[#F9FAF7]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8B0A2A] font-semibold mb-4">
                Under the hood
              </p>
              <h2 className="heading-serif text-4xl sm:text-5xl text-[#171717] leading-tight">
                Built for international students at USC.
              </h2>
            </div>
            <div className="space-y-6 text-base text-[#3F3F46] leading-relaxed">
              <p>
                George runs on Claude Sonnet 4.6 with prompt caching for speed.
                A multi-agent router sends each question to the right
                specialist. Events, courses, housing, social, and campus
                knowledge each have their own toolkit.
              </p>
              <p>
                Behind George is the BIA community. Real events, real course
                reviews from cohort fellows, and a knowledge base built on
                things upperclassmen wish they had known earlier. He pulls from
                a private store of campus tips that BIA officers curate.
              </p>
              <p>
                He remembers what you mention over time. Tell him your major and
                interests once, and he’ll stop asking. Tell him your sleep
                habits and he’ll filter roommate matches accordingly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-[#8B0A2A] to-[#71031f] text-white">
        <div className="mx-auto max-w-4xl px-6 py-28 sm:py-36 text-center">
          <div className="text-7xl sm:text-8xl mb-8">👻🐕</div>
          <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl leading-tight mb-6">
            Want early access?
          </h2>
          <p className="text-lg sm:text-xl text-white/70 mb-12 max-w-xl mx-auto leading-relaxed">
            Hop into the web preview to try George today, or join the waitlist
            and we’ll text you when iMessage opens up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/george/chat"
              className="group inline-flex items-center gap-3 bg-white text-[#8B0A2A] px-10 py-5 rounded-[12px] hover:bg-[#FEFFFC] transition-all duration-200 font-bold text-base tracking-wide uppercase shadow-2xl"
            >
              Try the preview
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <a
              href="https://forms.gle/qZfbiKdmasN6jid5A"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 border-2 border-white/40 text-white px-10 py-5 rounded-[12px] hover:bg-white/10 hover:border-white transition-all duration-200 font-bold text-base tracking-wide uppercase"
            >
              Join the waitlist
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer credit */}
      <footer className="bg-[#0A0A0B] text-white/40 text-xs">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-mono uppercase tracking-widest">
            George Tirebiter · A BIA project
          </div>
          <div className="font-mono uppercase tracking-widest">
            Claude Sonnet 4.6 · Multi-agent · Built at USC
          </div>
        </div>
      </footer>
    </div>
  );
}
