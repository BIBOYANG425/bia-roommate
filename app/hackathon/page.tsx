import type { Metadata } from "next";

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
  },
];

const PARTNERS = [
  "UCLA CSSA",
  "UCLA FIT",
  "合抱之木",
  "USC SESE",
  "Claremont SCA",
];

export default function HackathonPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: "'Menlo','SF Mono','Courier New',monospace" }}>
      <article className="max-w-[720px] mx-auto">

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

        {/* ─── Title ─── */}
        <section className="px-6 pt-8 pb-7 border-b border-[#30363d]">
          <h1 className="text-[28px] font-black mb-4 leading-tight" style={{ fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" }}>
            60人，24小时，15个产品。
          </h1>
          <p className="text-[22px] font-bold mb-5 leading-snug text-[#3fb950]" style={{ fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" }}>
            BIA首届Hackathon，收工。
          </p>
          <p className="text-[13px] text-[#8b949e]">
            <span className="inline-block bg-[#1c2128] border border-[#30363d] rounded px-2 py-0.5 text-[#e3b341] text-[11px] mr-2">a3f9c12</span>
            post-event review · shipped
          </p>
        </section>

        {/* ─── What Happened ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// WHAT HAPPENED</p>
          <p className="mb-4" style={{ fontFamily: "'PingFang SC',sans-serif" }}>3月28日，USC。</p>
          <p className="mb-4" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            60个人走进来，带着想法。<br />24小时后，15个真实产品被交付。
          </p>
          <p className="mb-4 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            不是PPT。不是概念图。<br />是能跑、能用、能演示的东西。
          </p>
          <div className="border border-[#30363d] rounded-lg overflow-hidden my-5">
            <img src="/hackathon/full-room.jpg" alt="全场参赛者工作中" className="w-full block" loading="lazy" />
          </div>
          <p className="font-bold text-base" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            当AI成为真正的队友，24小时能造出什么？
          </p>
          <p className="mt-2 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>我们得到了答案。</p>
        </section>

        {/* ─── The Numbers ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// THE NUMBERS</p>
          <div className="grid grid-cols-2">
            {STATS.map((s) => (
              <div key={s.label} className="py-4 border-b border-[#21262d] last:border-0 [&:nth-last-child(2)]:border-0">
                <p className="text-[40px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[13px] text-[#8b949e] mt-1" style={{ fontFamily: "'PingFang SC',sans-serif" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Build With ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// BUILD WITH TRAE × MINIMAX</p>
          <p className="mb-4" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            每支队伍基于 <strong className="text-[#3fb950]">Trae.ai</strong> 开发——一个真正把AI Agent融入每一行代码的IDE。
          </p>
          <p className="mb-5" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            调用 <strong className="text-[#F4347F]">MiniMax</strong> 的多模态API——文本、视觉、语音、视频，全部拉满。
          </p>
          <div className="flex gap-2 mb-5">
            <div className="flex-1 border border-[#30363d] rounded-md overflow-hidden">
              <img src="/hackathon/working-1.jpg" alt="参赛者在写代码" className="w-full block" loading="lazy" />
            </div>
            <div className="flex-1 border border-[#30363d] rounded-md overflow-hidden">
              <img src="/hackathon/working-2.jpg" alt="团队讨论中" className="w-full block" loading="lazy" />
            </div>
          </div>
          <p className="text-[#8b949e] mb-1" style={{ fontFamily: "'PingFang SC',sans-serif" }}>不是在学怎么用AI。</p>
          <p className="font-bold" style={{ fontFamily: "'PingFang SC',sans-serif" }}>是在用AI造真正的产品。</p>
        </section>

        {/* ─── Speakers ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// KEYNOTE SPEAKERS</p>
          <p className="mb-5 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            来自 Trae 和 MiniMax 的技术负责人到场，带参赛者快速了解工具能力，直接上手。
          </p>
          <div className="flex gap-2">
            <div className="flex-1 border border-[#30363d] rounded-md overflow-hidden flex flex-col">
              <img src="/hackathon/speaker-trae.jpg" alt="Trae 嘉宾分享" className="w-full block flex-1 object-cover" loading="lazy" />
              <div className="px-3 py-2 bg-[#1c2128]">
                <p className="text-[12px] text-[#3fb950] font-bold">TRAE.AI</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex-1 border border-[#30363d] rounded-md overflow-hidden">
                <img src="/hackathon/speaker-minimax-1.jpg" alt="MiniMax 嘉宾演讲" className="w-full block" loading="lazy" />
              </div>
              <div className="flex-1 border border-[#30363d] rounded-md overflow-hidden flex flex-col">
                <img src="/hackathon/speaker-minimax-2.jpg" alt="MiniMax 嘉宾分享" className="w-full block flex-1 object-cover" loading="lazy" />
                <div className="px-3 py-2 bg-[#1c2128]">
                  <p className="text-[12px] text-[#F4347F] font-bold">MINIMAX</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Winners ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// WINNERS</p>
          {WINNERS.map((w) => (
            <div key={w.rank} className="bg-[#1c2128] border border-[#30363d] rounded-lg overflow-hidden mb-4">
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
        </section>

        {/* ─── Sponsors ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-5 font-bold text-[#3fb950]">// WHO MADE THIS POSSIBLE</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {SPONSORS.map((s) => (
              <div key={s.alt} className="bg-[#1c2128] border border-[#30363d] rounded-lg p-4 text-center">
                <img src={s.logo} alt={s.alt} className="h-8 mx-auto mb-2.5 block" loading="lazy" style={{ borderRadius: s.alt === "饭团外卖" ? "6px" : undefined }} />
                <p className="text-[11px] text-[#8b949e] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mb-3">
            <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-4 w-[calc(50%-6px)] text-center">
              <img src="/hackathon/alipay-logo.png" alt="支付宝留学缴费" className="h-8 mx-auto mb-2.5 block rounded-md" loading="lazy" />
              <p className="text-[11px] text-[#8b949e] leading-relaxed" style={{ fontFamily: "'PingFang SC',sans-serif" }}>上支付宝缴学费，最高立省600元。</p>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            特别感谢 <strong className="text-[#e6edf3]">Gary Qi</strong> 从筹备到落地的全程支持。
          </p>
        </section>

        {/* ─── Community Partners ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// 社区合作伙伴</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PARTNERS.map((p) => (
              <span key={p} className="bg-[#1c2128] border border-[#30363d] rounded-full px-3.5 py-1.5 text-[12px]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
                {p}
              </span>
            ))}
          </div>
          <p className="text-sm text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            一场Hackathon，连接了整个南加的builder社区。
          </p>
        </section>

        {/* ─── Letter to Participants ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// 写给每一个参赛者</p>
          <div className="border border-[#30363d] rounded-lg overflow-hidden mb-5">
            <img src="/hackathon/working-3.jpg" alt="参赛者协作" className="w-full block" loading="lazy" />
          </div>
          <p className="mb-4" style={{ fontFamily: "'PingFang SC',sans-serif" }}>你花了24小时，写了代码，交了产品，站上去做了展示。</p>
          <p className="mb-4 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>很多人想了一年的事情，你用一天做完了。</p>
          <div className="border-l-[3px] border-[#3fb950] bg-[#1c2128] px-5 py-4 rounded-r-md">
            <p className="font-bold text-base" style={{ fontFamily: "'PingFang SC',sans-serif" }}>不管排名多少，你已经赢了。</p>
          </div>
        </section>

        {/* ─── Why We Build ─── */}
        <section className="px-6 py-7 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// WHY WE BUILD</p>
          <p className="mb-4" style={{ fontFamily: "'PingFang SC',sans-serif" }}>BIA永远在学习。</p>
          <p className="mb-4 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            从第一天起，我们就相信一件事：<br />留学生社团不应该只做social和聚餐。
          </p>
          <p className="mb-4 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            当AI重新定义每个行业的时候，我们选择站在最前面——不是旁观，是亲手去造。
          </p>
          <p className="mb-4 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            这场Hackathon不是终点。它是BIA走向技术前沿的第一步。
          </p>
          <div className="border border-[#30363d] rounded-lg overflow-hidden mb-5">
            <img src="/hackathon/bia-staff.jpg" alt="BIA组织团队" className="w-full block" loading="lazy" />
            <div className="px-3 py-2 bg-[#1c2128]">
              <p className="text-[12px] text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>BIA 组织团队 & USC SESE</p>
            </div>
          </div>
          <div className="border-l-[3px] border-[#e3b341] bg-[#1c2128] px-5 py-4 rounded-r-md">
            <p className="font-bold text-base" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
              我们不追风口，我们造风口。<br />下一个前沿，BIA已经在路上了。
            </p>
          </div>
        </section>

        {/* ─── What's Next ─── */}
        <section className="px-6 py-8 border-b border-[#30363d]">
          <p className="text-[11px] tracking-[4px] mb-4 font-bold text-[#3fb950]">// WHAT&apos;S NEXT</p>
          <p className="mb-3 text-lg font-bold" style={{ fontFamily: "'PingFang SC',sans-serif" }}>第一次，但绝不是最后一次。</p>
          <p className="mb-5 text-[#8b949e]" style={{ fontFamily: "'PingFang SC',sans-serif" }}>下一场，已经在路上了。</p>
          <p className="text-xl font-black text-[#3fb950]">Stay tuned.</p>
        </section>

        {/* ─── Footer ─── */}
        <section className="px-6 py-6 bg-[#161b22] text-center">
          <p className="text-[13px] text-[#8b949e] mb-1" style={{ fontFamily: "'PingFang SC',sans-serif" }}>
            BIA (Bridging Internationals Association) @ USC
          </p>
          <p className="text-[12px] text-[#484f58]">关注我们，不错过下一场。</p>
        </section>

      </article>
    </div>
  );
}
