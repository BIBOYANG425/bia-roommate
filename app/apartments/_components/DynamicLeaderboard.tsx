"use client";

import { useMemo } from "react";
import type { ProductLanguage } from "@/components/ProductShell";
import { APARTMENTS } from "@/lib/apartments/data";
import { useVoteTallies } from "./VoteTalliesProvider";

// ─── Dynamic Leaderboard ──────────────────────────────────────────────────────

interface VoteRank {
  aptId: string;
  name: string;
  accentColor: string;
  up: number;
  down: number;
  net: number;
}

export default function DynamicLeaderboard({
  language,
}: {
  language: ProductLanguage;
}) {
  const { tallies } = useVoteTallies();

  const ranks = useMemo<VoteRank[]>(
    () =>
      Object.entries(tallies)
        .map(([aptId, c]) => {
          const apt = APARTMENTS.find((a) => a.id === aptId);
          if (!apt) return null;
          return {
            aptId,
            name: apt.name,
            accentColor: apt.accentColor,
            up: c.up,
            down: c.down,
            net: c.up - c.down,
          };
        })
        .filter((x): x is VoteRank => x !== null)
        .sort((a, b) => b.net - a.net)
        .slice(0, 5),
    [tallies],
  );

  if (ranks.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <div className="border-[3px] border-[var(--black)]" style={{ background: "var(--beige)" }}>
        <div className="border-b-[3px] border-[var(--black)] px-5 py-3 flex items-center gap-3">
          <span className="font-display text-sm tracking-[0.15em]" style={{ color: "var(--black)" }}>
            {language === "zh" ? "用户投票榜" : "COMMUNITY VOTES"}
          </span>
          <span className="font-display text-[10px] tracking-[0.1em]" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "实时动态" : "LIVE"}
          </span>
        </div>
        <div className="flex overflow-x-auto">
          {ranks.map((rank, i) => (
            <div
              key={rank.aptId}
              className="flex-1 min-w-[140px] border-r-[3px] border-[var(--black)] last:border-r-0 px-4 py-4"
            >
              <span className="font-display text-2xl" style={{ color: rank.accentColor }}>#{i + 1}</span>
              <p className="font-display text-sm text-[var(--black)] truncate mt-1">{rank.name}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: "var(--mid)" }}>👍 {rank.up}</span>
                <span className="text-[11px]" style={{ color: "var(--mid)" }}>👎 {rank.down}</span>
              </div>
              <span className="font-display text-[10px] tracking-wider mt-1 block" style={{ color: rank.net >= 0 ? "#2a8a2a" : "#cc4400" }}>
                {rank.net >= 0 ? "+" : ""}{rank.net} {language === "zh" ? "净赞" : "net"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
