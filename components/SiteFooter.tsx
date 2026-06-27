"use client";

// The single footer for every Landing-system page. Unified links so they never
// drift across pages. (The home page keeps its own scroll-reveal treatment but
// the same links; everyone else renders this standard dark band.)
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/components/LanguageProvider";

const SECONDARY = [
  { en: "Team", zh: "团队", href: "/team" },
  { en: "Sponsors", zh: "合作伙伴", href: "/sponsors" },
  { en: "Contact", zh: "联系我们", href: "/contact" },
  { en: "FAQ", zh: "常见问题", href: "/faq" },
  { en: "Privacy", zh: "隐私政策", href: "/privacy" },
  { en: "Terms", zh: "服务条款", href: "/terms" },
];

const SOCIALS = [
  { label: "Insta", href: "https://www.instagram.com/bia_usc/" },
  { label: "小红书", href: "https://xhslink.com/m/2t4EzpZAKAc" },
];

export default function SiteFooter() {
  const { language: lang } = useLanguage();
  return (
    <footer className="bg-[#1F1F29] text-white px-6 sm:px-16 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-white/15 pb-12 mb-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <Link href="/" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">
              {t.footer.home[lang]}
            </Link>
            <Link href="/about" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">
              {t.nav.about[lang]}
            </Link>
            <Link href="/events" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">
              {t.nav.events[lang]}
            </Link>
            <Link
              href="/roommates"
              className="hover:text-[#A0D7D1] transition-colors link-hover py-2"
              style={{ fontFamily: "var(--font-display-zh)" }}
            >
              {t.nav.freshmanServices[lang]}
            </Link>
          </div>
          <div className="flex gap-6">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium opacity-80 hover:opacity-100 hover:text-[#A0D7D1] transition-colors link-hover py-2 px-1 min-w-[44px] text-center"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <nav className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-70">
          {SECONDARY.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-[#A0D7D1] transition-colors link-hover py-1"
            >
              {lang === "zh" ? l.zh : l.en}
            </Link>
          ))}
        </nav>
        <div className="flex justify-between items-center text-xs opacity-60 font-light">
          <p>
            &copy; {new Date().getFullYear()} {t.footer.copyright[lang]}
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Los Angeles, CA
          </p>
        </div>
      </div>
    </footer>
  );
}
