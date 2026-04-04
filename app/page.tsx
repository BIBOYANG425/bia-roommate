"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline ml-1" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" }));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">

      {/* ─── Floating Navbar ─── */}
      <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
        <nav className="glass-nav text-white w-full max-w-4xl py-3 px-6 flex items-center justify-between pointer-events-auto shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-6">
            <Link href="/" className="heading-serif text-xl tracking-tight">BIA</Link>
            <div className="hidden sm:flex gap-6 text-sm text-gray-200">
              <Link href="#" className="link-hover">Home</Link>
              <Link href="#" className="link-hover">About</Link>
              <Link href="/events" className="link-hover">Events</Link>
              <Link href="/join" className="link-hover">Join Us</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden sm:flex items-center gap-2 opacity-80 border border-white/20 px-3 py-1 rounded-full text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              LA {time || "..."}
            </div>
            <Link href="/join" className="bg-[#171717] hover:bg-[#2C2C2C] text-white px-5 py-2 rounded-full transition-colors flex items-center shadow-lg">
              Join Us
            </Link>
          </div>
        </nav>
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative h-[95vh] w-full flex items-center justify-center overflow-hidden bg-[#1F1F29]">
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
          <h1 className="heading-serif text-white text-[12vw] sm:text-[80px] drop-shadow-xl leading-none">
            BIA at USC
          </h1>
        </div>

        {/* Bottom Left Glass Card */}
        <div className="absolute bottom-10 sm:bottom-16 left-6 sm:left-16 z-20 max-w-sm">
          <div className="glass-panel p-6 text-white text-left shadow-2xl">
            <p className="text-[#A0D7D1] text-xs uppercase tracking-widest font-semibold mb-2 drop-shadow-md">Bridging Internationals</p>
            <p className="text-sm opacity-90 mb-4 leading-relaxed font-light">
              Meaningful exchange between international students and American communities through tech, career, and culture.
            </p>
            <Link href="#mission" className="inline-flex items-center text-sm font-medium hover:text-[#A0D7D1] transition-colors link-hover">
              Learn More <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Mission Section ─── */}
      <section id="mission" className="py-24 sm:py-32 px-6 sm:px-16 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative">
        <div className="w-full md:w-1/2 rounded-3xl overflow-hidden aspect-square md:aspect-[4/3] bg-gray-200 shadow-xl border border-black/5 relative group">
          <img
            src="https://placehold.co/800x800/dcdcdc/171717?text=Pixel+Art+Lightbulb+Circuit"
            alt="Pixel Art Mission"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]"
          />
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="heading-serif text-[#171717] text-4xl sm:text-5xl mb-6 leading-tight">
            Where bridging global communities starts.
          </h2>
          <p className="text-[#646464] text-lg leading-relaxed max-w-lg mb-8">
            Our vision is to empower international voices at USC by fostering an inclusive environment that intersects technology, professional growth, and shared experiences. We are building the foundational network for global ambition.
          </p>
          <div className="h-px w-24 bg-[#A0D7D1]"></div>
        </div>
      </section>

      {/* ─── What We Do Section (Stepper) ─── */}
      <section className="py-24 sm:py-32 bg-[#F9FAF7] px-6 sm:px-16 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto">
          <h2 className="heading-serif text-5xl mb-16 text-center text-[#171717]">What We Do</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sticky top-32">
            {[
              { num: "01", title: "Cultural Bridge", desc: "Connecting distinct backgrounds into a cohesive community. Integrating via social and cultural bounds.", icon: "Circles" },
              { num: "02", title: "Tech & Innovation", desc: "Scaling ideas into actionable projects and hackathons. Build, break, and ship with the brightest.", icon: "Squares" },
              { num: "03", title: "Career Dev", desc: "Automating and optimizing your transition to the global workforce. From networking to employment.", icon: "Lines" },
            ].map((step) => (
              <div key={step.num} className="flex flex-col gap-6 group">
                <div>
                  <span className="text-[#A0D7D1] font-medium text-sm tracking-widest">{step.num}</span>
                  <h3 className="heading-serif text-3xl mt-2 mb-3 text-[#2C2C2C]">{step.title}</h3>
                  <p className="text-[#646464] font-light leading-relaxed">{step.desc}</p>
                </div>
                <div className="w-full aspect-video bg-[#FEFFFC] rounded-2xl shadow-sm border border-black/5 flex items-center justify-center p-6 group-hover:shadow-md transition-shadow">
                  {/* Minimal line-art diagram placeholder */}
                  <img src={`https://placehold.co/400x250/FEFFFC/334444?text=${step.icon}+Diagram`} className="opacity-70" alt="" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Product/Event Section ─── */}
      <section className="relative w-full h-[85vh] flex items-center px-6 sm:px-16 overflow-hidden bg-[#0081C0]">
        <img
          src="https://placehold.co/1920x1080/0081C0/FFFFFF?text=Bright+Daytime+Pixel+Art+Sunflower+Field"
          alt="Daytime Pixel Art USC"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 hover:scale-105 transition-transform duration-[10s]"
        />
        <div className="relative z-10 max-w-2xl text-white">
          <span className="inline-block px-4 py-1.5 border border-white/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 glass-panel">
            Upcoming Event
          </span>
          <h2 className="heading-serif text-5xl sm:text-6xl mb-6 leading-tight drop-shadow-md">BIA Hackathon: Build with AI</h2>
          <p className="text-lg opacity-90 mb-8 max-w-lg font-light leading-relaxed">
            Join 500+ participants in our annual tech summit. Dive into LLMs, scale autonomous agents, and win incredible prizes.
          </p>
          <button className="bg-white text-[#0081C0] px-8 py-3 rounded-full hover:bg-[#F9FAF7] hover:scale-105 transition-all font-medium flex items-center gap-2 shadow-xl">
            Register Now <ArrowIcon />
          </button>
        </div>

        {/* Fake Popup Notification */}
        <div className="absolute top-32 right-10 z-20 glass-panel p-4 w-72 hidden md:block animate-fade-in shadow-2xl">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-white/80">✨</div>
            <div>
              <p className="text-white font-medium text-sm drop-shadow-sm">New registration!</p>
              <p className="text-white/80 text-xs">A user from CS Dept joined.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Blog/Articles ─── */}
      <section className="py-24 sm:py-32 px-6 sm:px-16 max-w-7xl mx-auto">
        <h2 className="heading-serif text-4xl sm:text-5xl mb-12 text-[#171717]">Latest Dispatches</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group cursor-pointer flex flex-col">
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-6 border border-black/5 shadow-sm">
                <img
                  src={`https://placehold.co/600x400/e0e0e0/334444?text=Blog+Art+${i}`}
                  alt={`Article ${i}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h3 className="text-2xl font-medium text-[#2C2C2C] mb-3 group-hover:text-[#A0D7D1] transition-colors heading-serif leading-snug">
                {["Inside the miHoYo Recruiting Session", "Startup 101 with YC China Founders", "Navigating USC as an International CS Major"][i - 1]}
              </h3>
              <p className="text-sm text-[#A0D7D1] font-medium tracking-wide mt-auto uppercase">By BIA Editorial Team</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA/Closing ─── */}
      <section className="py-32 px-6 text-center border-t border-black/5 bg-[#FEFFFC]">
        <h2 className="heading-serif text-4xl sm:text-5xl md:text-6xl max-w-4xl mx-auto text-[#171717] mb-10 leading-tight">
          We're building community and opportunity for the next generation of global builders.
        </h2>
        <Link href="/join" className="text-xl text-[#334444] hover:text-[#A0D7D1] transition-colors inline-flex items-center gap-2 link-hover pb-1 font-medium">
          If that sounds interesting, come join us <ArrowIcon />
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative bg-[#1F1F29] text-white pt-32 pb-8 overflow-hidden mt-auto">
        {/* Nighttime Footer Art Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://placehold.co/1920x800/1F1F29/fedd76?text=USC+Night+Skyline+Pixel+Art+Fireflies"
            alt="Nighttime Skyline"
            className="w-full h-full object-cover opacity-40 hover:scale-105 transition-transform duration-[20s]"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-16 mt-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 border-b border-white/20 pb-12 mb-8">
            <div className="flex gap-10 text-sm font-medium">
              <Link href="#" className="hover:text-[#A0D7D1] transition-colors link-hover">Home</Link>
              <Link href="#" className="hover:text-[#A0D7D1] transition-colors link-hover">About</Link>
              <Link href="#" className="hover:text-[#A0D7D1] transition-colors link-hover">Events</Link>
              <Link href="#" className="hover:text-[#A0D7D1] transition-colors link-hover">Contact</Link>
            </div>
            <div className="flex gap-8">
              {['Insta', 'X', 'LinkedIn', 'Discord'].map(social => (
                <a key={social} href="#" className="text-sm font-medium opacity-80 hover:opacity-100 hover:text-[#A0D7D1] transition-colors link-hover">
                  {social}
                </a>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-xs opacity-60 font-light">
            <p>&copy; {new Date().getFullYear()} Bridging Internationals Association.</p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Los Angeles, CA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
