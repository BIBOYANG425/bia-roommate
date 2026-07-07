"use client";

import Link from "next/link";
import { SITE } from "@/lib/seo";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";
import { SECONDARY_LINKS } from "@/lib/nav-links";

// Shared chrome for the public "legitimacy" pages (About / Team / Events /
// Sponsors / Contact). Client component so the header can carry the same en/zh
// language toggle as SiteNav and render bilingual labels; the page content it
// wraps is still server-rendered (passed in as `children`) and stays crawlable.
// A consistent header + footer across these pages is itself a trust signal.

const secondary = (href: string) =>
  SECONDARY_LINKS.find((l) => l.href === href)!;

// Primary top-nav for the legitimacy pages. About/Events reuse the shared
// nav dictionary; the rest reuse the shared secondary-link data so labels
// never drift from the footer.
const NAV: { href: string; en: string; zh: string }[] = [
  { href: "/about", en: t.nav.about.en, zh: t.nav.about.zh },
  secondary("/team"),
  { href: "/events", en: t.nav.events.en, zh: t.nav.events.zh },
  secondary("/sponsors"),
  secondary("/faq"),
  secondary("/contact"),
];

const PRIVACY = secondary("/privacy");
const TERMS = secondary("/terms");

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language: lang, setLanguage: setLang } = useLanguage();
  const label = (l: { en: string; zh: string }) => (lang === "zh" ? l.zh : l.en);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--cream)", color: "var(--black)" }}
    >
      <header
        className="border-b-[3px] sticky top-0 z-30"
        style={{ borderColor: "var(--black)", background: "var(--cream)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-2xl tracking-tight">
            BIA
          </Link>
          <nav className="flex flex-wrap items-center gap-3 sm:gap-5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-display text-[11px] tracking-[0.12em] uppercase hover:opacity-60"
                style={{ color: "var(--mid)" }}
              >
                {label(item)}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="border-[2px] px-3 py-1.5 font-display text-[11px] tracking-[0.12em] uppercase hover:opacity-60 cursor-pointer"
              style={{ borderColor: "var(--black)", color: "var(--black)" }}
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
            <Link
              href="/join"
              className="border-[2px] px-3 py-1.5 font-display text-[11px] tracking-[0.12em] uppercase text-white"
              style={{ borderColor: "var(--black)", background: "var(--cardinal)" }}
            >
              {label(t.nav.joinUs)}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        className="border-t-[3px] mt-16"
        style={{ borderColor: "var(--black)", background: "var(--black)", color: "var(--cream)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl">BIA</p>
            <p className="mt-2 max-w-xs text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {SITE.fullName} — a USC international student community. Est. {SITE.foundingYear}.
            </p>
          </div>
          <div>
            <p className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--gold)" }}>
              Explore
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:opacity-60" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {label(item)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--gold)" }}>
              Connect
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <a href={`mailto:${SITE.email}`} className="hover:opacity-60" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {SITE.email}
                </a>
              </li>
              <li>
                <a href={SITE.socials[0]} target="_blank" rel="noreferrer" className="hover:opacity-60" style={{ color: "rgba(255,255,255,0.85)" }}>
                  Instagram
                </a>
              </li>
              <li>
                <Link href={PRIVACY.href} className="hover:opacity-60" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {label(PRIVACY)}
                </Link>
              </li>
              <li>
                <Link href={TERMS.href} className="hover:opacity-60" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {label(TERMS)}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t px-4 py-4 text-center text-xs sm:px-6" style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}>
          © {SITE.foundingYear}–present {SITE.fullName}. University of Southern California, Los Angeles.
        </div>
      </footer>
    </div>
  );
}
