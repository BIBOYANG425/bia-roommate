// components/squad/ForYouSection.tsx
// 为你推荐: approved direction = variant C grid + variant A's numbered black
// rank squares on the top 3 (design G2/G3). States per spec §11.6:
//   loading → SkeletonCard ×3 | empty → warm copy + post CTA | error → handled
//   by the PARENT (quiet fallback tag; section not rendered) | partial → render
//   what cleared, no fake reasons.
"use client";

import Link from "next/link";
import { SquadPost } from "@/lib/types";
import SquadCard from "@/components/squad/SquadCard";
import SkeletonCard from "@/components/SkeletonCard";
import ReasonChip from "@/components/squad/ReasonChip";

export interface ForYouItem { post: SquadPost; rank: number; reason: string | null }

export default function ForYouSection({
  items, loading, onSelect,
}: {
  items: ForYouItem[]; loading: boolean; onSelect: (post: SquadPost) => void;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-display text-[28px] sm:text-[36px]" style={{ color: "var(--black)" }}>
          为你推荐 <span style={{ color: "var(--cardinal)" }}>FOR YOU</span>
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="brutal-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--black)" }}>
            还没有匹配你的局 — 先去逛逛全部，或者发一个？
          </p>
          <Link href="/squad/submit" className="brutal-btn brutal-btn-primary shrink-0">
            发布找搭子 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ post, rank, reason }) => (
            <div key={post.id} className="relative">
              {rank <= 3 && (
                <div
                  aria-label={`第 ${rank} 名推荐`}
                  className="absolute -top-3 -left-3 z-10 w-10 h-10 flex items-center justify-center font-display text-xl text-white border-[3px] border-[var(--black)]"
                  style={{ background: "var(--black)" }}
                >
                  {rank}
                </div>
              )}
              <SquadCard post={post} onClick={() => onSelect(post)} />
              <div className="mt-1 px-1"><ReasonChip reason={reason} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
