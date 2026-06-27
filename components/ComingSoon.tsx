"use client";

// Honest placeholder for a paused feature. Shown when its lib/features flag is on.
// Matches the marketing palette (cream / #171717, Instrument Serif heading).

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

type Bilingual = { en: string; zh: string };

export default function ComingSoon({
  name,
  tagline,
  waitlist,
}: {
  name: Bilingual;
  tagline?: Bilingual;
  waitlist?: { href: string };
}) {
  const { language: lang } = useLanguage();

  return (
    <main className="relative min-h-[100svh] flex flex-col items-center justify-center bg-[#FEFFFC] text-[#171717] px-6 text-center overflow-hidden">
      {/* soft radial wash so the empty state doesn't read as a broken page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 38%, #171717 0%, transparent 70%)",
        }}
      />

      <span className="relative text-[11px] sm:text-xs uppercase tracking-[0.35em] text-[#171717]/40 mb-7">
        {t.comingSoon.kicker[lang]}
      </span>

      <h1 className="relative heading-serif text-5xl sm:text-6xl md:text-7xl leading-[1.05] mb-6">
        {name[lang]}
      </h1>

      <p className="relative text-base sm:text-lg text-[#171717]/55 max-w-md leading-relaxed">
        {(tagline ?? t.comingSoon.body)[lang]}
      </p>

      <div className="relative mt-11 flex flex-wrap items-center justify-center gap-3">
        {waitlist && (
          <a
            href={waitlist.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#171717] text-white px-7 py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors duration-200 hover:bg-[#171717]/90 min-h-[44px]"
          >
            {t.comingSoon.waitlist[lang]}
          </a>
        )}
        <Link
          href="/"
          className={`inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors duration-200 min-h-[44px] ${
            waitlist
              ? "border border-[#171717]/15 text-[#171717] hover:bg-[#171717]/5"
              : "bg-[#171717] text-white hover:bg-[#171717]/90"
          }`}
        >
          {t.comingSoon.back[lang]}
        </Link>
      </div>
    </main>
  );
}
