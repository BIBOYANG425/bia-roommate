"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SERVICES_DATA } from "@/lib/services";
import CardSwap, { Card } from "@/components/CardSwap";
import ScrollFloat from "@/components/ScrollFloat";
import { t, type Lang } from "@/lib/i18n";

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline ml-1" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [time, setTime] = useState("");
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" }));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <main className="relative z-10 flex flex-col bg-transparent">

        {/* ─── Floating Navbar ─── */}
        <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
          <nav className="glass-nav text-white w-full max-w-4xl py-3 px-6 flex items-center justify-between pointer-events-auto shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="BIA" width={32} height={26} className="object-contain" style={{ height: "auto" }} />
                <span className="heading-serif text-xl tracking-tight">BIA</span>
              </Link>
              <div className="hidden sm:flex gap-4 text-sm text-gray-200">
                <Link href="/about" className="link-hover py-2 px-1">{t.nav.about[lang]}</Link>
                <Link href="/events" className="link-hover py-2 px-1">{t.nav.events[lang]}</Link>
                <Link href="/roommates" className="link-hover py-2 px-1" style={{ fontFamily: "var(--font-display-zh)" }}>{t.nav.freshmanServices[lang]}</Link>
                <Link href="/join" className="link-hover py-2 px-1">{t.nav.joinUs[lang]}</Link>
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
              <Link href="/join" className="bg-[#171717] hover:bg-[#2C2C2C] text-white px-5 py-2 rounded-full transition-colors flex items-center shadow-lg">
                {t.nav.joinUs[lang]}
              </Link>
            </div>
          </nav>
        </div>

        {/* ─── Hero Section (sticky, gets covered by content) ─── */}
        <section className="sticky top-0 z-10 h-[95vh] w-full flex items-center justify-center overflow-hidden bg-[#1F1F29]">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-usc-anime.jpg"
              alt="USC Campus Golden Hour Anime Style"
              className="w-full h-full object-cover opacity-75 hover:scale-105 transition-transform duration-[10s] ease-in-out bg-[#1F1F29]"
            />
          </div>

          {/* Title */}
          <div className="relative z-10 text-center w-full px-4">
            <ScrollFloat
              animateOnMount
              mountDelay={0.3}
              animationDuration={0.8}
              ease="back.out(1.7)"
              stagger={0.05}
              textClassName="heading-serif text-white text-[16vw] sm:text-[120px] leading-none"
            >
              {"BIA at "}
              <span style={{ fontFamily: "var(--font-playlist)", color: "#71031f", textShadow: "0 4px 20px rgba(113,3,31,0.4), 0 2px 6px rgba(0,0,0,0.5)" }}>USC</span>
            </ScrollFloat>
          </div>

          {/* Bottom Left Glass Card */}
          <div className="absolute bottom-10 sm:bottom-16 left-6 sm:left-16 z-20 max-w-sm">
            <div className="glass-panel p-6 text-white text-left shadow-2xl">
              <p className="text-[#A0D7D1] text-xs uppercase tracking-widest font-semibold mb-2 drop-shadow-md">{t.hero.subtitle[lang]}</p>
              <p className="text-sm mb-4 leading-relaxed font-light">
                {t.hero.desc[lang]}
              </p>
              <Link href="#mission" className="inline-flex items-center text-sm font-medium hover:text-[#A0D7D1] transition-colors link-hover">
                {t.hero.learnMore[lang]} <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Main Content Overlay (scrolls over hero, reveals footer) ─── */}
        <div className="relative z-20 bg-[#F9FAF7] rounded-t-[2.5rem] -mt-10 shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">

          {/* ─── Mission Section ─── */}
          <section id="mission" className="py-24 sm:py-32 px-6 sm:px-16 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative">
            <div className="w-full md:w-1/2 rounded-3xl overflow-hidden aspect-square md:aspect-[4/3] bg-[#1F1F29] shadow-xl border border-black/5 relative group">
              <Image
                src="/globe-community.jpg"
                alt="Hand holding glowing globe — bridging global communities"
                width={800}
                height={600}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]"
              />
            </div>
            <div className="w-full md:w-1/2">
              <h2 className="heading-serif text-[#171717] text-4xl sm:text-5xl mb-6 leading-tight">
                {t.mission.heading[lang]}
              </h2>
              <p className="text-[#646464] text-lg leading-relaxed max-w-lg mb-8">
                {t.mission.desc[lang]}
              </p>
              <div className="h-px w-24 bg-[#A0D7D1]"></div>
            </div>
          </section>

          {/* ─── 新生服务 — CardSwap in Apple Folder ─── */}
          <section className="relative overflow-hidden bg-[#F9FAF7] py-24 sm:py-32 px-6 sm:px-16">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
            <div className="max-w-5xl mx-auto">
              <h2 className="heading-serif text-4xl sm:text-5xl mb-2 text-[#171717]" style={{ fontFamily: "var(--font-display-zh)" }}>{t.services.heading[lang]}</h2>
              <p className="text-[#999] text-sm uppercase tracking-widest mb-10">{t.services.subtitle[lang]}</p>

              {/* Folder tab */}
              <div className="flex items-end">
                <div
                  className="relative px-8 py-3 rounded-t-xl"
                  style={{
                    background: "linear-gradient(180deg, #5AC8C8 0%, #3BAAAA 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  <span className="text-white text-sm font-semibold tracking-wide" style={{ fontFamily: "var(--font-display-zh)" }}>新生服务</span>
                </div>
                <div
                  className="px-5 py-2 rounded-t-lg ml-0.5"
                  style={{
                    background: "linear-gradient(180deg, #D8D8DA 0%, #C4C4C8 100%)",
                  }}
                >
                  <span className="text-[#666] text-xs tracking-wide">Freshman Services</span>
                </div>
              </div>

              {/* Folder body */}
              <div
                className="rounded-b-2xl rounded-tr-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF 0%, #F4F4F6 100%)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                  </div>
                  <p className="text-[#999] text-xs tracking-wide">BIA &gt; 新生服务</p>
                  <div className="w-16" />
                </div>

                {/* CardSwap inside folder */}
                <div className="p-6 sm:p-10">
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left: CardSwap preview */}
                    <div className="w-full lg:w-3/5" style={{ height: '480px', position: 'relative' }}>
                      <CardSwap
                        cardDistance={50}
                        verticalDistance={60}
                        delay={4000}
                        pauseOnHover={true}
                      >
                        {t.services.items.map((svc, idx) => {
                          const hrefs = ["/roommates", "/course-planner", "/course-rating", "/sublet", "/usc-group"];
                          const previews = ["/previews/roommates.png", "/previews/course-planner.png", "/previews/course-rating.png", "/previews/sublet.png", "/previews/usc-group.png"];
                          return (
                          <Card key={svc.title.en} className="w-full h-full rounded-xl overflow-hidden border border-black/5 shadow-md bg-white">
                            <div className="relative w-full h-[65%]">
                              <img
                                src={previews[idx]}
                                alt={svc.sub[lang]}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div className="p-5 flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-semibold text-[#2C2C2C]" style={{ fontFamily: "var(--font-display-zh)" }}>{svc.title[lang]}</h3>
                                <span className="text-xs text-[#999] uppercase tracking-wider">{svc.sub[lang]}</span>
                              </div>
                              <p className="text-sm text-[#646464] leading-relaxed">{svc.desc[lang]}</p>
                              <Link href={hrefs[idx]} className="text-[#3AA8A8] text-sm font-medium mt-1 inline-flex items-center hover:text-[#2C2C2C] transition-colors">
                                {t.services.open[lang]} <ArrowIcon />
                              </Link>
                            </div>
                          </Card>
                          );
                        })}
                      </CardSwap>
                    </div>

                    {/* Right: Service list / sidebar */}
                    <div className="w-full lg:w-2/5 flex flex-col gap-4 pt-4">
                      <p className="text-xs text-[#999] uppercase tracking-widest mb-2">{t.services.available[lang]}</p>
                      {t.services.items.map((svc, idx) => {
                        const hrefs = ["/roommates", "/course-planner", "/course-rating", "/sublet", "/usc-group"];
                        return (
                        <Link
                          key={svc.title.en}
                          href={hrefs[idx]}
                          className="group flex items-center gap-4 p-3 rounded-lg hover:bg-[#E8F0F0] transition-colors"
                        >
                          <div className="relative w-10 h-8 shrink-0">
                            <div className="absolute inset-0 rounded" style={{ background: "linear-gradient(180deg, #6DD4D4 0%, #4ABCBC 100%)" }} />
                            <div className="absolute -top-1 left-1 w-4 h-1.5 rounded-t-sm" style={{ background: "#6DD4D4" }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#2C2C2C] group-hover:text-[#3AA8A8] transition-colors" style={{ fontFamily: "var(--font-display-zh)" }}>{svc.title[lang]}</p>
                            <p className="text-[10px] text-[#999] uppercase tracking-wider">{svc.sub[lang]}</p>
                          </div>
                        </Link>
                        );
                      })}

                      <div className="mt-4 pt-4 border-t border-black/5">
                        <p className="text-[#999] text-xs">{t.services.builtBy[lang]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>

          {/* ─── Three Pillars ─── */}
          <section className="py-24 sm:py-32 px-6 sm:px-16">
            <h2 className="heading-serif text-4xl sm:text-5xl mb-4 text-[#171717]">{t.pillars.heading[lang]}</h2>
            <p className="text-[#999] text-sm uppercase tracking-widest mb-16">{t.pillars.subtitle[lang]}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { image: "/cultural-bridge.jpg", idx: 0 },
                { image: "/tech-innovation.jpg", idx: 1 },
                { image: "/career-development.jpg", idx: 2 },
              ].map((pillar) => (
                <div key={pillar.idx} className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer">
                  <Image
                    src={pillar.image}
                    alt={t.pillars.items[pillar.idx].title[lang]}
                    width={600}
                    height={800}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-lg sm:text-xl font-medium leading-snug mb-1">{t.pillars.items[pillar.idx].title[lang]}</h3>
                    <p className="text-white/60 text-sm" style={{ fontFamily: "var(--font-display-zh)" }}>{t.pillars.items[pillar.idx].titleZh[lang]}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Featured Product/Event Section ─── */}
          <section className="relative w-full h-[85vh] flex items-center px-6 sm:px-16 overflow-hidden bg-[#1F1F29]">
            <img
              src="/hackathon-anime.jpg"
              alt="BIA Hackathon — students coding at USC"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-60 hover:scale-105 transition-transform duration-[10s]"
            />
            <div className="relative z-10 max-w-2xl text-white">
              <span className="inline-block px-4 py-1.5 border border-white/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 glass-panel">
                {t.hackathon.badge[lang]}
              </span>
              <h2 className="heading-serif text-5xl sm:text-6xl mb-6 leading-tight drop-shadow-md">{t.hackathon.title[lang]}</h2>
              <p className="text-lg opacity-90 mb-8 max-w-lg font-light leading-relaxed">
                {t.hackathon.desc[lang]}
              </p>
              <Link href="/events" className="bg-white text-[#1F1F29] px-8 py-3 rounded-full hover:bg-[#F9FAF7] hover:scale-105 transition-all font-medium inline-flex items-center gap-2 shadow-xl">
                {t.hackathon.cta[lang]} <ArrowIcon />
              </Link>
            </div>
          </section>

          {/* ─── Blog/Articles ─── */}
          <section className="py-24 sm:py-32 px-6 sm:px-16 max-w-7xl mx-auto">
            <h2 className="heading-serif text-4xl sm:text-5xl mb-12 text-[#171717]">{t.blog.heading[lang]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
              {[
                { href: "#", tilt: "-2deg", offset: "0px", image: "/blog-mihoyo.jpg", idx: 0 },
                { href: "#", tilt: "1.5deg", offset: "-8px", image: "/blog-yc-china.jpg", idx: 1 },
                { href: "/usc-group", tilt: "-1deg", offset: "4px", image: "/blog-class-2030.jpg", idx: 2 },
              ].map((post) => (
                <Link
                  key={post.idx}
                  href={post.href}
                  className="group flex flex-col tilted-card"
                  style={{
                    "--tilt": post.tilt,
                    "--offset": post.offset,
                    transform: `rotate(var(--tilt)) translateY(var(--offset))`,
                  } as React.CSSProperties}
                >
                  <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-6 border border-black/5 shadow-lg">
                    <img
                      src={post.image}
                      alt={t.blog.posts[post.idx][lang]}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h3 className="text-2xl font-medium text-[#2C2C2C] mb-3 group-hover:text-[#A0D7D1] transition-colors heading-serif leading-snug">
                    {t.blog.posts[post.idx][lang]}
                  </h3>
                  <p className="text-sm text-[#A0D7D1] font-medium tracking-wide mt-auto uppercase">{t.blog.byline[lang]}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── CTA/Closing ─── */}
          <section className="py-32 px-6 text-center border-t border-black/5 bg-[#FEFFFC] rounded-b-[2rem]">
            <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl max-w-4xl mx-auto text-[#171717] mb-10 leading-tight">
              {t.cta.heading[lang]}
            </h2>
            <Link href="/join" className="text-xl text-[#334444] hover:text-[#A0D7D1] transition-colors inline-flex items-center gap-2 link-hover pb-1 font-medium">
              {t.cta.link[lang]} <ArrowIcon />
            </Link>
          </section>

        </div>{/* end Main Content Overlay */}

        {/* ─── Footer Text Reveal Hole (Transparent) ─── */}
        <div className="relative w-full text-white flex flex-col justify-end pb-8 bg-transparent" style={{ height: "70vh", minHeight: "600px" }}>
          <div className="max-w-7xl mx-auto px-6 sm:px-16 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-white/20 pb-12 mb-8">
              <div className="flex gap-6 text-sm font-medium">
                <Link href="/" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">{t.footer.home[lang]}</Link>
                <Link href="/about" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">{t.nav.about[lang]}</Link>
                <Link href="/events" className="hover:text-[#A0D7D1] transition-colors link-hover py-2">{t.nav.events[lang]}</Link>
                <Link href="/roommates" className="hover:text-[#A0D7D1] transition-colors link-hover py-2" style={{ fontFamily: "var(--font-display-zh)" }}>{t.nav.freshmanServices[lang]}</Link>
              </div>
              <div className="flex gap-6">
                {['Insta', 'X', 'LinkedIn', 'Discord'].map(social => (
                  <a key={social} href="#" className="text-sm font-medium opacity-80 hover:opacity-100 hover:text-[#A0D7D1] transition-colors link-hover py-2 px-1 min-w-[44px] text-center">
                    {social}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs opacity-60 font-light">
              <p>&copy; {new Date().getFullYear()} {t.footer.copyright[lang]}</p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Los Angeles, CA
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer Fixed Background ─── */}
      <footer className="fixed bottom-0 left-0 w-full z-0 bg-[#1F1F29]" style={{ height: "70vh", minHeight: "600px" }}>
        <div className="absolute inset-0 z-0">
          <img
            src="/footer-night.jpg"
            alt="USC Campus at Night — Pixel Art"
            loading="lazy"
            className="w-full h-full object-cover object-bottom opacity-40 hover:scale-105 transition-transform duration-[20s]"
          />
        </div>
      </footer>
    </div>
  );
}
