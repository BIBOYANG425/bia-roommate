"use client";

// The single floating glass navbar for every Landing-system page (home, about,
// events, membership, blog…). Don't hand-copy this onto a page — import it, so
// the links never drift. 新生服务 / tools pages use ProductShell instead.
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

const NAV_LINKS = [
  { href: "/about", key: "about", zhFont: false, ghost: false },
  { href: "/events", key: "events", zhFont: false, ghost: false },
  { href: "/roommates", key: "freshmanServices", zhFont: true, ghost: false },
  { href: "/blog", key: "blog", zhFont: false, ghost: false },
  { href: "/george/about", key: "george", zhFont: false, ghost: true },
  { href: "/join", key: "joinUs", zhFont: false, ghost: false },
] as const;

export default function SiteNav() {
  const { language: lang, setLanguage: setLang } = useLanguage();
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div className="text-white w-full max-w-4xl pointer-events-auto rounded-2xl border border-white/10 bg-[#1f1f29]/70 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <div className="w-full flex flex-col">
          <nav className="w-full py-3 px-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="BIA"
                  width={32}
                  height={26}
                  className="object-contain"
                  style={{ height: "auto" }}
                />
                <span className="heading-serif text-xl tracking-tight">BIA</span>
              </Link>
              <div className="hidden sm:flex gap-4 text-sm text-gray-200 items-center">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="link-hover py-3 px-1 inline-flex items-center gap-1"
                    style={l.zhFont ? { fontFamily: "var(--font-display-zh)" } : undefined}
                  >
                    {t.nav[l.key][lang]}
                    {l.ghost && (
                      <span aria-hidden className="text-base leading-none">
                        👻
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => setLang(lang === "en" ? "zh" : "en")}
                className="hidden sm:flex items-center gap-1.5 border border-white/20 px-4 py-2.5 rounded-full text-xs text-white/80 hover:text-white hover:border-white/40 transition-colors cursor-pointer min-h-[44px]"
              >
                {lang === "en" ? "中文" : "EN"}
              </button>
              <div className="hidden sm:flex items-center gap-2 opacity-80 border border-white/20 px-3 py-1 rounded-full text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                LA {time || "..."}
              </div>
              <Link
                href="/join"
                className="bg-white/90 text-[#171717] hover:bg-white px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center shadow-lg font-semibold text-sm tracking-wide min-h-[44px]"
              >
                {t.nav.joinUs[lang]}
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
                aria-expanded={menuOpen}
                className="sm:hidden flex items-center justify-center border border-white/20 rounded-lg text-white/90 min-h-[44px] min-w-[44px] text-xl leading-none"
              >
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
          </nav>
          {menuOpen && (
            <div className="sm:hidden flex flex-col px-6 pb-4 text-sm text-gray-200">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="py-3 border-b border-white/10 inline-flex items-center gap-1"
                  style={l.zhFont ? { fontFamily: "var(--font-display-zh)" } : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t.nav[l.key][lang]}
                  {l.ghost && <span aria-hidden>👻</span>}
                </Link>
              ))}
              <button
                onClick={() => setLang(lang === "en" ? "zh" : "en")}
                className="py-3 text-left text-white/80"
              >
                {lang === "en" ? "中文" : "EN"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
