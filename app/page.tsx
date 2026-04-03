import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import {
  BridgeIllustration,
  CloudDivider,
  CulturalBridge,
  CircuitNode,
  CompassRose,
  IconHome,
  IconKey,
  IconUsers,
  IconBook,
  IconStar,
  IconChat,
} from "@/components/illustrations";
import type { ComponentType, SVGProps } from "react";

const PILLARS = [
  {
    num: "01",
    name: "Cultural Bridge",
    description:
      "Meaningful exchange between international students and American communities — orientation events, social gatherings, and cross-cultural dialogue.",
    Icon: CulturalBridge,
  },
  {
    num: "02",
    name: "Tech & Innovation",
    description:
      "Exploring and applying cutting-edge technology trends — AI hackathons, startup talks, and hands-on building sessions.",
    Icon: CircuitNode,
  },
  {
    num: "03",
    name: "Career Development",
    description:
      "Company sharing sessions, resume optimization, and resource matching to help international students enter the global workforce.",
    Icon: CompassRose,
  },
];

const SERVICES: {
  label: string;
  sub: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { label: "找室友", sub: "Roommate Match", href: "/roommates", Icon: IconHome },
  { label: "转租", sub: "Sublet", href: "/sublet", Icon: IconKey },
  { label: "找搭子", sub: "Find Partners", href: "/roommates", Icon: IconUsers },
  { label: "选课", sub: "Course Planner", href: "/course-planner", Icon: IconBook },
  { label: "课评", sub: "Course Reviews", href: "/course-rating", Icon: IconStar },
  { label: "USC 新生群", sub: "Freshman Groups", href: "/usc-group", Icon: IconChat },
];

const EVENTS = [
  {
    title: "miHoYo Recruiting Session",
    date: "Oct 2025",
    detail: "500+ attendees. Exclusive campus recruiting event.",
  },
  {
    title: "Startup 101 with YC China",
    date: "Dec 2025",
    detail: "Founders from Y Combinator China share real startup lessons.",
  },
  {
    title: "AI Hackathon",
    date: "Spring 2026",
    detail: "Build with LLMs, ship in 48 hours, win prizes.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* ─── Minimal Nav ─── */}
      <nav
        className="flex items-center justify-between px-6 sm:px-10 py-5"
        style={{ background: "var(--cream)" }}
      >
        <Link
          href="/"
          className="text-[18px] font-bold tracking-[0.04em]"
          style={{
            fontFamily: "var(--font-display-en), serif",
            color: "var(--ink)",
          }}
        >
          BIA
        </Link>
        <Link
          href="/roommates"
          className="text-[13px] tracking-[0.02em]"
          style={{
            fontFamily: "var(--font-display-zh), serif",
            color: "var(--ink-muted)",
            transition: "color 200ms ease-out",
          }}
        >
          新生服务
        </Link>
      </nav>

      {/* ─── Hero ─── */}
      <section
        className="relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{
          background: "var(--cream)",
          minHeight: "100svh",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        {/* Decorative dot pattern along left edge */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "60px",
            height: "100%",
            backgroundImage:
              "radial-gradient(circle, var(--ink-muted) 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
            opacity: 0.15,
          }}
        />
        {/* Decorative dot pattern along right edge */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "60px",
            height: "100%",
            backgroundImage:
              "radial-gradient(circle, var(--ink-muted) 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
            opacity: 0.15,
          }}
        />

        <h1
          style={{
            fontFamily: "var(--font-display-en), serif",
            fontSize: "clamp(60px, 10vw, 120px)",
            fontWeight: 400,
            lineHeight: 0.95,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          BIA
        </h1>

        <p
          className="mt-4 sm:mt-6"
          style={{
            fontFamily: "var(--font-display-en), serif",
            fontSize: "clamp(14px, 2vw, 20px)",
            fontWeight: 400,
            color: "var(--ink-muted)",
            letterSpacing: "0.08em",
          }}
        >
          Bridging Internationals Association
        </p>

        <p
          className="mt-3"
          style={{
            fontSize: "clamp(11px, 1.2vw, 14px)",
            color: "var(--ink-muted)",
            letterSpacing: "0.15em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          USC &middot; Est. 2024
        </p>

        {/* Bridge illustration */}
        <div className="mt-8 sm:mt-12" aria-hidden="true">
          <BridgeIllustration
            style={{
              color: "var(--ink-muted)",
              opacity: 0.6,
              width: "clamp(200px, 40vw, 300px)",
              height: "auto",
            }}
          />
        </div>

        {/* Scroll indicator */}
        <div
          className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="28"
            viewBox="0 0 20 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="1"
              y="1"
              width="18"
              height="26"
              rx="9"
              stroke="var(--ink-muted)"
              strokeWidth="1.5"
            />
            <circle cx="10" cy="8" r="2" fill="var(--ink-muted)" />
          </svg>
        </div>
      </section>

      {/* ─── Cloud Divider ─── */}
      <div
        aria-hidden="true"
        style={{
          background: "var(--cream-light)",
          color: "var(--ink-muted)",
          opacity: 0.4,
          paddingTop: "0.5rem",
        }}
      >
        <CloudDivider />
      </div>

      {/* ─── Mission ─── */}
      <section
        className="py-24 sm:py-32 px-6"
        style={{ background: "var(--cream-light)" }}
      >
        <ScrollReveal>
          <p
            className="max-w-3xl mx-auto text-center"
            style={{
              fontSize: "clamp(18px, 3vw, 28px)",
              lineHeight: 1.6,
              color: "var(--ink)",
              fontWeight: 400,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            We{" "}
            <span style={{ fontFamily: "var(--font-display-en), serif", fontStyle: "italic" }}>
              bridge
            </span>{" "}
            cultural exchange, encourage members to explore cutting-edge{" "}
            <span style={{ fontFamily: "var(--font-display-en), serif", fontStyle: "italic" }}>
              technology
            </span>
            , and provide hands-on support to help international students
            integrate into the{" "}
            <span style={{ fontFamily: "var(--font-display-en), serif", fontStyle: "italic" }}>
              American workplace
            </span>{" "}
            and the global stage.
          </p>
        </ScrollReveal>
      </section>

      {/* ─── Three Pillars ─── */}
      <section
        className="relative py-20 sm:py-28 px-6 sm:px-10 dot-grid"
        style={{ background: "var(--cream)" }}
      >
        {/* Dot-grid is set via CSS class; we layer a semi-transparent cream to soften it */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--cream)",
            opacity: 0.92,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <ScrollReveal>
            <p
              className="mb-12 sm:mb-16"
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "var(--ink-muted)",
                fontFamily: "system-ui, sans-serif",
                textTransform: "uppercase",
              }}
            >
              What We Do
            </p>
          </ScrollReveal>

          <div className="max-w-4xl mx-auto">
            {PILLARS.map((pillar, i) => (
              <ScrollReveal key={pillar.num} delay={i * 100}>
                <div
                  className="pillar-row py-8 sm:py-10"
                  style={{
                    borderTop: "1px solid var(--ink-muted)",
                    ...(i === PILLARS.length - 1
                      ? { borderBottom: "1px solid var(--ink-muted)" }
                      : {}),
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8">
                    {/* Icon + number */}
                    <div
                      className="flex items-center gap-3"
                      style={{ flexShrink: 0 }}
                    >
                      <pillar.Icon
                        style={{
                          color: "var(--ink-muted)",
                          opacity: 0.7,
                          width: "36px",
                          height: "36px",
                        }}
                        aria-hidden="true"
                      />
                      <span
                        style={{
                          fontFamily: "system-ui, sans-serif",
                          fontSize: "12px",
                          color: "var(--ink-muted)",
                          letterSpacing: "0.05em",
                          width: "2rem",
                        }}
                      >
                        {pillar.num}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3
                        style={{
                          fontFamily: "var(--font-display-en), serif",
                          fontSize: "clamp(22px, 3vw, 32px)",
                          fontWeight: 400,
                          color: "var(--ink)",
                          lineHeight: 1.2,
                          margin: 0,
                        }}
                      >
                        {pillar.name}
                      </h3>
                      <p
                        className="mt-2 sm:mt-3"
                        style={{
                          fontFamily: "system-ui, sans-serif",
                          fontSize: "clamp(14px, 1.5vw, 16px)",
                          color: "var(--ink-muted)",
                          lineHeight: 1.6,
                          maxWidth: "520px",
                        }}
                      >
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section
        className="py-20 sm:py-28 px-6 sm:px-10"
        style={{ background: "var(--cream-light)" }}
      >
        <ScrollReveal>
          <p
            className="mb-12 sm:mb-16"
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "var(--ink-muted)",
              fontFamily: "system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            新生服务
          </p>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
          {SERVICES.map((svc, i) => (
            <ScrollReveal key={svc.label} delay={i * 80}>
              <Link href={svc.href} className="block">
                <div className="service-card rounded-sm px-6 py-8 sm:px-8 sm:py-10">
                  <svc.Icon
                    className="service-icon"
                    style={{
                      width: "24px",
                      height: "24px",
                      marginBottom: "12px",
                    }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display-zh), serif",
                      fontSize: "clamp(20px, 2.5vw, 26px)",
                      fontWeight: 400,
                      color: "var(--ink)",
                      display: "block",
                    }}
                  >
                    {svc.label}
                  </span>
                  <span
                    className="mt-1 block"
                    style={{
                      fontFamily: "system-ui, sans-serif",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {svc.sub}
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Events ─── */}
      <section
        className="py-20 sm:py-28 px-6 sm:px-10"
        style={{ background: "var(--cream)" }}
      >
        <ScrollReveal>
          <p
            className="mb-12 sm:mb-16"
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "var(--ink-muted)",
              fontFamily: "system-ui, sans-serif",
              textTransform: "uppercase",
            }}
          >
            Past Events
          </p>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto">
          {EVENTS.map((evt, i) => (
            <ScrollReveal key={evt.title} delay={i * 100}>
              <div
                className="py-6 sm:py-8"
                style={{
                  borderTop: "1px solid var(--ink-muted)",
                  ...(i === EVENTS.length - 1
                    ? { borderBottom: "1px solid var(--ink-muted)" }
                    : {}),
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                  <div
                    className="flex items-center gap-2"
                    style={{ flexShrink: 0, minWidth: "5rem" }}
                  >
                    {/* Decorative dots */}
                    <span className="event-dot" aria-hidden="true" />
                    <span className="event-dot" aria-hidden="true" />
                    <span
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {evt.date}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4
                      style={{
                        fontFamily: "var(--font-display-en), serif",
                        fontSize: "clamp(16px, 2vw, 22px)",
                        fontWeight: 400,
                        color: "var(--ink)",
                        lineHeight: 1.3,
                        margin: 0,
                      }}
                    >
                      {evt.title}
                    </h4>
                    <p
                      className="mt-1"
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: "14px",
                        color: "var(--ink-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {evt.detail}
                    </p>
                  </div>
                  {/* Decorative line element on right */}
                  <div
                    aria-hidden="true"
                    className="hidden sm:block"
                    style={{
                      width: "32px",
                      height: "1px",
                      background: "var(--ink-muted)",
                      opacity: 0.3,
                      flexShrink: 0,
                      alignSelf: "center",
                    }}
                  />
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Dark Footer ─── */}
      <footer
        className="relative py-16 sm:py-20 px-6 sm:px-10 overflow-hidden"
        style={{ background: "var(--ink)" }}
      >
        {/* Decorative bridge illustration in background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.04,
            pointerEvents: "none",
          }}
        >
          <BridgeIllustration
            style={{
              color: "var(--cream)",
              width: "clamp(300px, 60vw, 500px)",
              height: "auto",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h2
              style={{
                fontFamily: "var(--font-display-en), serif",
                fontSize: "clamp(28px, 5vw, 48px)",
                fontWeight: 400,
                color: "var(--cream)",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Join BIA
            </h2>
            <p
              className="mt-4 mb-10"
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: "14px",
                color: "var(--ink-muted)",
                lineHeight: 1.6,
              }}
            >
              3,500+ followers. 1,500+ group chat members. 80+ cohort alumni.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-12">
              <a
                href="https://www.instagram.com/bia_usc/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "13px",
                  color: "var(--cream)",
                  letterSpacing: "0.05em",
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                  transition: "border-color 200ms ease-out",
                }}
                className="hover-underline-cream"
              >
                Instagram
              </a>
              <a
                href="https://xhslink.com/m/2t4EzpZAKAc"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "13px",
                  color: "var(--cream)",
                  letterSpacing: "0.05em",
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                  transition: "border-color 200ms ease-out",
                }}
                className="hover-underline-cream"
              >
                小红书
              </a>
              <span
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "13px",
                  color: "var(--cream)",
                  letterSpacing: "0.05em",
                }}
              >
                WeChat: BIA_USC
              </span>
            </div>
          </ScrollReveal>

          <p
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: "11px",
              color: "var(--ink-muted)",
              letterSpacing: "0.1em",
            }}
          >
            &copy; {new Date().getFullYear()} Bridging Internationals
            Association at USC
          </p>
        </div>
      </footer>
    </main>
  );
}
