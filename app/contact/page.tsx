import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Bridging Internationals Association (BIA) at USC — email, social, partnerships, and how to join the community.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    label: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    hint: "General questions, partnerships, and press.",
  },
  {
    label: "Instagram",
    value: "@bia_usc",
    href: SITE.socials[0],
    hint: "Event announcements and community updates.",
  },
  {
    label: "Join BIA",
    value: "Membership",
    href: "/join",
    hint: "Become part of the community.",
  },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--cardinal)", color: "white" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>
            University of Southern California · Los Angeles
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[0.95] sm:text-[64px]">Contact</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "rgba(255,255,255,0.85)" }}>
            Questions, partnership ideas, or want to get involved? Reach out —
            we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {CHANNELS.map((c) => {
            const external = c.href.startsWith("http") || c.href.startsWith("mailto:");
            const inner = (
              <>
                <p className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--mid)" }}>
                  {c.label}
                </p>
                <p className="mt-2 font-display text-2xl" style={{ color: "var(--cardinal)" }}>{c.value}</p>
                <p className="mt-2 text-sm" style={{ color: "var(--mid)" }}>{c.hint}</p>
              </>
            );
            return external ? (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noreferrer" : undefined}
                className="block border-[3px] p-6 transition-transform hover:-translate-y-0.5"
                style={{ borderColor: "var(--black)", background: "var(--cream)" }}
              >
                {inner}
              </a>
            ) : (
              <Link
                key={c.label}
                href={c.href}
                className="block border-[3px] p-6 transition-transform hover:-translate-y-0.5"
                style={{ borderColor: "var(--black)", background: "var(--cream)" }}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}
