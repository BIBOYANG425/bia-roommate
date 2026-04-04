import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "BIA Hackathon Review — Build with Trae × MiniMax",
  description:
    "60人，24小时，15个产品。BIA首届Hackathon回顾 — March 28, 2026 @ USC",
};

const STATS = [
  { value: "60", color: "#3fb950", label: "位参赛者" },
  { value: "15", color: "#58a6ff", label: "个项目提交" },
  { value: "24h", color: "#f0883e", label: "从零到交付" },
  { value: "$1,500+", color: "#e3b341", label: "总奖金池" },
];

const WINNERS = [
  {
    rank: "🥇 FIRST PLACE",
    prize: "$800",
    color: "#e3b341",
    demo: "/hackathon/first-demo.jpg",
    team: "/hackathon/first-team.jpg",
    demoAlt: "冠军团队展示",
    teamAlt: "冠军团队合影",
  },
  {
    rank: "🥈 SECOND PLACE",
    prize: "$500",
    color: "#8b949e",
    demo: "/hackathon/second-demo.jpg",
    team: "/hackathon/second-team.jpg",
    demoAlt: "亚军团队展示",
    teamAlt: "亚军团队合影",
  },
  {
    rank: "🥉 THIRD PLACE",
    prize: "$200",
    color: "#cd7f32",
    demo: "/hackathon/third-demo.jpg",
    team: "/hackathon/third-team.jpg",
    demoAlt: "季军团队展示",
    teamAlt: "季军团队合影",
  },
];

const SPONSORS = [
  {
    logo: "/hackathon/trae-logo.png",
    alt: "Trae",
    desc: "字节跳动旗下AI IDE，SOLO模式用自然语言直接构建完整应用。",
  },
  {
    logo: "/hackathon/minimax-logo.png",
    alt: "MiniMax",
    desc: "万亿参数多模态大模型，文本/视觉/语音/视频全栈API。",
  },
  {
    logo: "/hackathon/photon-logo.png",
    alt: "Photon",
    desc: "赛道支持方，免费SDK + Residency Program最高$1,000额外奖金。",
  },
  {
    logo: "/hackathon/fantuan-logo.png",
    alt: "饭团外卖",
    desc: "活动餐饮合作伙伴。24小时Hackathon，吃饱才能造好产品。",
    rounded: true,
  },
];

const PARTNERS = [
  "UCLA CSSA",
  "UCLA FIT",
  "合抱之木",
  "USC SESE",
  "Claremont SCA",
];

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HackathonPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">

      {/* ─── Top Nav Bar ─── */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#8b949e] hover:text-white transition-colors text-sm"
          >
            <BackArrow />
            <Image src="/logo.png" alt="BIA" width={20} height={16} style={{ height: "auto" }} />
            <span className="font-medium">BIA</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-[#484f58]">
            <span className="hidden sm:inline" style={{ fontFamily: "'Menlo','SF Mono',monospace" }}>hackathon-recap.md</span>
            <span className="bg-[#1c2128] border border-[#30363d] rounded px-2 py-0.5 text-[#3fb950] text-[11px]" style={{ fontFamily: "'Menlo','SF Mono',monospace" }}>published</span>
          </div>
        </div>
      </nav>

      {/* ─── Blog Article ─── */}
      <article className="max-w-[720px] mx-auto" style={{ fontFamily: "'Menlo','SF Mono','Courier New',monospace" }}>

        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden">
          <img
            src="/hackathon/group-photo.jpg"
            alt="Build with TRAE × MiniMax @ USC — 全体合影"
            className="w-full block opacity-85"
          />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-10" style={{ background: "linear-gradient(transparent, #0d1117)" }}>
            <p className="text-[11px] tracking-[4px] mb-2 font-bold text-[#3fb950]">// HACKATHON RECAP</p>
            <p className="text-[13px] text-[#8b949e]">MARCH 28, 2026 · USC · LOS ANGELES</p>
          </div>
        </section>

        {/* ─── Title Block ─── */}
        <header className="px-6 pt-10 pb-8 border-b border-[#30363d]">
          <div className="flex items-center gap-3 mb-6 text-[12px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            <Image src="/logo.png" alt="BIA" width={24} height={20} style={{ height: "auto" }} />
            <span>BIA Editorial</span>
            <span className="text-[#30363d]">·</span>
            <time>March 28, 2026</time>
            <span className="text-[#30363d]">·</span>
            <span>8 min read</span>
          </div>
          <h1 className="text-[32px] sm:text-[36px] font-black mb-4 leading-tight" style={{ fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" }}>
            60人，24小时，15个产品。
          </h1>
          <p className="text-[22px] sm:text-[26px] font-bold mb-6 leading-snug text-[#3fb950]" style={{ fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" }}>
            BIA首届Hackathon，收工。
          </p>
          <div className="flex items-center gap-3 text-[13px] text-[#8b949e]">
            <span className="inline-block bg-[#1c2128] border border-[#30363d] rounded px-2 py-0.5 text-[#e3b341] text-[11px]" style={{ fontFamily: "'Menlo',monospace" }}>a3f9c12</span>
            <span>post-event review · shipped</span>
          </div>
        </header>

        {/* ─── Table of Contents ─── */}
        <nav className="px-6 py-5 border-b border-[#30363d] bg-[#161b22]/50">
          <p className="text-[11px] tracking-[3px] mb-3 font-bold text-[#484f58] uppercase">Contents</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {["What Happened", "The Numbers", "Build With", "Speakers", "Winners", "Sponsors", "Why We Build"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-[#58a6ff] hover:text-[#79c0ff] transition-colors">
                {item}
              </a>
            ))}
          </div>
        </nav>

        {/* ─── What Happened ─── */}
        <section id="what-happened" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// WHAT HAPPENED</p>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>3月28日，USC。</p>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            60个人走进来，带着想法。<br />24小时后，15个真实产品被交付。
          </p>
          <p className="mb-4 text-[15px] leading-relaxed text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            不是PPT。不是概念图。<br />是能跑、能用、能演示的东西。
          </p>
          <figure className="my-8">
            <div className="border border-[#30363d] rounded-lg overflow-hidden">
              <img src="/hackathon/full-room.jpg" alt="全场参赛者工作中" className="w-full block" loading="lazy" />
            </div>
            <figcaption className="mt-2 text-[12px] text-[#484f58] text-center" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
              全场60位参赛者在USC现场
            </figcaption>
          </figure>
          <p className="font-bold text-lg" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            当AI成为真正的队友，24小时能造出什么？
          </p>
          <p className="mt-2 text-[#8b949e] text-[15px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>我们得到了答案。</p>
        </section>

        {/* ─── The Numbers ─── */}
        <section id="the-numbers" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-6 font-bold text-[#3fb950]">// THE NUMBERS</p>
          <div className="grid grid-cols-2 gap-px bg-[#21262d] rounded-lg overflow-hidden">
            {STATS.map((s) => (
              <div key={s.label} className="bg-[#0d1117] p-6">
                <p className="text-[44px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[13px] text-[#8b949e] mt-2" style={{ fontFamily: "'PingFang SC',sans-serif" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Build With ─── */}
        <section id="build-with" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// BUILD WITH TRAE × MINIMAX</p>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            每支队伍基于 <strong className="text-[#3fb950]">Trae.ai</strong> 开发——一个真正把AI Agent融入每一行代码的IDE。
          </p>
          <p className="mb-6 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            调用 <strong className="text-[#F4347F]">MiniMax</strong> 的多模态API——文本、视觉、语音、视频，全部拉满。
          </p>
          <div className="grid grid-cols-2 gap-3 my-8">
            <figure className="border border-[#30363d] rounded-lg overflow-hidden">
              <img src="/hackathon/working-1.jpg" alt="参赛者在写代码" className="w-full block" loading="lazy" />
            </figure>
            <figure className="border border-[#30363d] rounded-lg overflow-hidden">
              <img src="/hackathon/working-2.jpg" alt="团队讨论中" className="w-full block" loading="lazy" />
            </figure>
          </div>
          <p className="text-[#8b949e] mb-1 text-[15px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>不是在学怎么用AI。</p>
          <p className="font-bold text-[15px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>是在用AI造真正的产品。</p>
        </section>

        {/* ─── Speakers ─── */}
        <section id="speakers" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// KEYNOTE SPEAKERS</p>
          <p className="mb-6 text-[15px] text-[#8b949e] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            来自 Trae 和 MiniMax 的技术负责人到场，带参赛者快速了解工具能力，直接上手。
          </p>
          <div className="flex gap-3">
            <figure className="flex-1 border border-[#30363d] rounded-lg overflow-hidden flex flex-col">
              <img src="/hackathon/speaker-trae.jpg" alt="Trae 嘉宾分享" className="w-full block flex-1 object-cover" loading="lazy" />
              <div className="px-3 py-2.5 bg-[#1c2128]">
                <p className="text-[12px] text-[#3fb950] font-bold">TRAE.AI</p>
              </div>
            </figure>
            <div className="flex-1 flex flex-col gap-3">
              <figure className="flex-1 border border-[#30363d] rounded-lg overflow-hidden">
                <img src="/hackathon/speaker-minimax-1.jpg" alt="MiniMax 嘉宾演讲" className="w-full block" loading="lazy" />
              </figure>
              <figure className="flex-1 border border-[#30363d] rounded-lg overflow-hidden flex flex-col">
                <img src="/hackathon/speaker-minimax-2.jpg" alt="MiniMax 嘉宾分享" className="w-full block flex-1 object-cover" loading="lazy" />
                <div className="px-3 py-2.5 bg-[#1c2128]">
                  <p className="text-[12px] text-[#F4347F] font-bold">MINIMAX</p>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* ─── Winners ─── */}
        <section id="winners" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-6 font-bold text-[#3fb950]">// WINNERS</p>
          <div className="space-y-5">
            {WINNERS.map((w) => (
              <div key={w.rank} className="bg-[#1c2128] border border-[#30363d] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#30363d] flex items-center">
                  <span className="text-[11px] font-bold tracking-[2px]" style={{ color: w.color }}>{w.rank}</span>
                  <span className="ml-auto text-[20px] font-black" style={{ color: w.color }}>{w.prize}</span>
                </div>
                <img src={w.demo} alt={w.demoAlt} className="w-full block" loading="lazy" />
                <div className="p-4">
                  <img src={w.team} alt={w.teamAlt} className="w-full block rounded-md" loading="lazy" />
                </div>
              </div>
            ))}

            {/* Photon Track */}
            <div className="bg-[#1c2128] border border-[#30363d] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#30363d]">
                <span className="text-[11px] font-bold tracking-[2px] text-[#bc8cff]">⚡ PHOTON.CODES 专项赛道</span>
              </div>
              <img src="/hackathon/photon-demo.jpg" alt="Photon赛道团队展示" className="w-full block" loading="lazy" />
              <div className="p-4">
                <img src="/hackathon/photon-team.jpg" alt="Photon赛道获奖团队" className="w-full block rounded-md" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Sponsors ─── */}
        <section id="sponsors" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-6 font-bold text-[#3fb950]">// WHO MADE THIS POSSIBLE</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {SPONSORS.map((s) => (
              <div key={s.alt} className="bg-[#1c2128] border border-[#30363d] rounded-lg p-5 text-center">
                <img src={s.logo} alt={s.alt} className="h-8 mx-auto mb-3 block" loading="lazy" style={{ borderRadius: "rounded" in s ? "6px" : undefined }} />
                <p className="text-[12px] text-[#8b949e] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-5 w-[calc(50%-6px)] text-center">
              <img src="/hackathon/alipay-logo.png" alt="支付宝留学缴费" className="h-8 mx-auto mb-3 block rounded-md" loading="lazy" />
              <p className="text-[12px] text-[#8b949e] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>上支付宝缴学费，最高立省600元。</p>
            </div>
          </div>
          <p className="mt-5 text-[13px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            特别感谢 <strong className="text-[#e6edf3]">Gary Qi</strong> 从筹备到落地的全程支持。
          </p>
        </section>

        {/* ─── Community Partners ─── */}
        <section className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// 社区合作伙伴</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PARTNERS.map((p) => (
              <span key={p} className="bg-[#1c2128] border border-[#30363d] rounded-full px-4 py-2 text-[13px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
                {p}
              </span>
            ))}
          </div>
          <p className="text-[15px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            一场Hackathon，连接了整个南加的builder社区。
          </p>
        </section>

        {/* ─── Letter to Participants ─── */}
        <section className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// 写给每一个参赛者</p>
          <figure className="my-6">
            <div className="border border-[#30363d] rounded-lg overflow-hidden">
              <img src="/hackathon/working-3.jpg" alt="参赛者协作" className="w-full block" loading="lazy" />
            </div>
          </figure>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>你花了24小时，写了代码，交了产品，站上去做了展示。</p>
          <p className="mb-6 text-[15px] leading-relaxed text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>很多人想了一年的事情，你用一天做完了。</p>
          <blockquote className="border-l-[3px] border-[#3fb950] bg-[#1c2128] px-6 py-5 rounded-r-md">
            <p className="font-bold text-[17px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>不管排名多少，你已经赢了。</p>
          </blockquote>
        </section>

        {/* ─── Why We Build ─── */}
        <section id="why-we-build" className="px-6 py-10 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// WHY WE BUILD</p>
          <p className="mb-4 text-[15px] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>BIA永远在学习。</p>
          <p className="mb-4 text-[15px] leading-relaxed text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            从第一天起，我们就相信一件事：<br />留学生社团不应该只做social和聚餐。
          </p>
          <p className="mb-4 text-[15px] leading-relaxed text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            当AI重新定义每个行业的时候，我们选择站在最前面——不是旁观，是亲手去造。
          </p>
          <p className="mb-6 text-[15px] leading-relaxed text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            这场Hackathon不是终点。它是BIA走向技术前沿的第一步。
          </p>
          <figure className="my-8">
            <div className="border border-[#30363d] rounded-lg overflow-hidden">
              <img src="/hackathon/bia-staff.jpg" alt="BIA组织团队" className="w-full block" loading="lazy" />
              <div className="px-4 py-2.5 bg-[#1c2128]">
                <p className="text-[12px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>BIA 组织团队 & USC SESE</p>
              </div>
            </div>
          </figure>
          <blockquote className="border-l-[3px] border-[#e3b341] bg-[#1c2128] px-6 py-5 rounded-r-md">
            <p className="font-bold text-[17px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
              我们不追风口，我们造风口。<br />下一个前沿，BIA已经在路上了。
            </p>
          </blockquote>
        </section>

        {/* ─── What's Next ─── */}
        <section className="px-6 py-12 border-b border-[#30363d] text-center">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// WHAT&apos;S NEXT</p>
          <p className="mb-3 text-xl font-bold" style={{ fontFamily: "'PingFang SC',sans-serif" }}>第一次，但绝不是最后一次。</p>
          <p className="mb-6 text-[#8b949e] text-[15px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>下一场，已经在路上了。</p>
          <p className="text-2xl font-black text-[#3fb950]">Stay tuned.</p>
        </section>

        {/* ─── Blog Footer ─── */}
        <footer className="px-6 py-10 bg-[#161b22]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="BIA" width={28} height={23} style={{ height: "auto" }} />
              <div>
                <p className="text-[13px] text-[#e6edf3] font-medium">Bridging Internationals Association</p>
                <p className="text-[12px] text-[#484f58]">@ USC · Est. 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-[13px] text-[#58a6ff] hover:text-[#79c0ff] transition-colors flex items-center gap-1.5"
              >
                <BackArrow /> Back to Home
              </Link>
              <span className="text-[#30363d]">·</span>
              <Link
                href="/roommates"
                className="text-[13px] text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
              >
                新生服务
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#21262d] text-center">
            <p className="text-[12px] text-[#484f58]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
              关注我们，不错过下一场。
            </p>
          </div>
        </footer>

      </article>
    </div>
  );
}
