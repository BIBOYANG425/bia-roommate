"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SquadPost, SQUAD_CATEGORIES, SQUAD_GENDER_OPTIONS } from "@/lib/types";
import SquadCard, { CATEGORY_COLORS } from "@/components/squad/SquadCard";
import SquadModal from "@/components/squad/SquadModal";
import SkeletonCard from "@/components/SkeletonCard";
import Toast from "@/components/Toast";
import NavTabs from "@/components/NavTabs";

const ALL_CATS = ["全部", ...SQUAD_CATEGORIES] as const;

function Marquee({
  bg,
  text,
  items,
}: {
  bg: string;
  text: string;
  items: string[];
}) {
  const content = items.join("  //  ") + "  //  ";
  return (
    <div
      className="overflow-hidden border-y-[3px] border-[var(--black)]"
      style={{ background: bg, color: text }}
    >
      <div className="marquee-track py-2">
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">
          {content}
        </span>
        <span className="font-display text-sm tracking-[0.15em] whitespace-nowrap px-4">
          {content}
        </span>
      </div>
    </div>
  );
}

function SquadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<SquadPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selected, setSelected] = useState<SquadPost | null>(null);

  const [cat, setCat] = useState<string>("全部");
  const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "deadline">("newest");

  useEffect(() => {
    if (searchParams.get("posted") === "true") {
      setShowToast(true);
      router.replace("/squad", { scroll: false });
    }
  }, [searchParams, router]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/squad");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setPosts(data);
    } catch {
      setError("LOAD FAILED — RETRY");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filtered = posts
    .filter((p) => {
      if (cat !== "全部" && p.category !== cat) return false;
      if (genderFilter && p.gender_restriction !== genderFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "deadline") {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main className="min-h-screen">
      {showToast && (
        <Toast
          message="SQUAD POST DROPPED"
          onClose={() => setShowToast(false)}
        />
      )}

      <NavTabs />

      <Marquee
        bg="var(--gold)"
        text="var(--black)"
        items={[
          "BIA 找搭子",
          "FIND YOUR SQUAD",
          "拼车 · 自习 · 约会 · 健身 · 游戏",
          "DROP A POST",
          "USC · BERKELEY · STANFORD",
        ]}
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--cream)" }}
      >
        <div className="ghost-text -left-4 top-1/2 -translate-y-1/2">
          SQUAD
        </div>
        <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20 relative flex flex-col sm:flex-row sm:items-end gap-8 justify-between">
          <div>
            <div className="new-drop-badge mb-3">NEW</div>
            <h1
              className="font-display text-[56px] sm:text-[80px] leading-[0.85] mb-4"
              style={{ color: "var(--black)" }}
            >
              BIA
              <br />
              <span className="glitch-text" style={{ color: "var(--cardinal)" }}>
                找搭子
              </span>
            </h1>
            <p className="text-sm max-w-sm" style={{ color: "var(--mid)" }}>
              发帖找搭档 — 拼车、自习、约会、健身、游戏，什么都行。
            </p>
          </div>
          <Link
            href="/squad/submit"
            className="brutal-btn brutal-btn-primary self-start sm:self-auto shrink-0"
          >
            POST SQUAD →
          </Link>
        </div>
      </section>

      {/* Browse */}
      <section className="max-w-6xl mx-auto px-6 py-8 relative">
        <span className="section-number">01</span>
        <h2
          className="font-display text-[40px] sm:text-[60px] mb-6"
          style={{ color: "var(--black)" }}
        >
          BROWSE
        </h2>

        {/* Category tabs */}
        <div className="flex gap-0 mb-6 overflow-x-auto">
          {ALL_CATS.map((c) => {
            const active = cat === c;
            const color = c === "全部" ? "var(--black)" : CATEGORY_COLORS[c];
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="font-display text-sm tracking-[0.08em] px-5 py-3 border-[3px] border-[var(--black)] -mr-[3px] shrink-0 transition-colors"
                style={{
                  background: active ? color : "var(--cream)",
                  color: active ? "white" : "var(--mid)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="brutal-select"
          >
            <option value="">ALL GENDERS</option>
            {SQUAD_GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "newest" | "deadline")
            }
            className="brutal-select"
          >
            <option value="newest">最新发布</option>
            <option value="deadline">截止时间</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p
              className="font-display text-2xl"
              style={{ color: "var(--cardinal)" }}
            >
              {error}
            </p>
            <button
              onClick={fetchPosts}
              className="brutal-btn brutal-btn-gold mt-6"
            >
              RETRY
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 relative">
            <div className="ghost-text left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px]">
              EMPTY
            </div>
            <h3
              className="font-display text-3xl mb-3 relative"
              style={{ color: "var(--black)" }}
            >
              {posts.length === 0 ? "NO POSTS YET" : "NO MATCHES"}
            </h3>
            <p
              className="text-sm mb-6 relative"
              style={{ color: "var(--mid)" }}
            >
              {posts.length === 0
                ? "Be the first to drop a squad post."
                : "Try adjusting your filters."}
            </p>
            {posts.length === 0 && (
              <Link
                href="/squad/submit"
                className="brutal-btn brutal-btn-primary inline-block relative"
              >
                POST SQUAD
              </Link>
            )}
          </div>
        ) : (
          <>
            <p
              className="text-xs mb-4"
              style={{
                color: "var(--mid)",
                fontFamily: "var(--font-body)",
              }}
            >
              {filtered.length} POSTS FOUND
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((post, i) => (
                <div
                  key={post.id}
                  className="reveal"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <SquadCard
                    post={post}
                    onClick={() => setSelected(post)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Bottom marquee */}
      <Marquee
        bg="var(--cardinal)"
        text="var(--gold)"
        items={[
          "FIND YOUR SQUAD",
          "BIA 找搭子",
          "拼车 自习 约会 健身 游戏",
          "DROP A POST",
          "USC · BERKELEY · STANFORD",
        ]}
      />

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          BIA 找搭子 — FIND YOUR SQUAD
        </p>
      </footer>

      {selected && (
        <SquadModal
          post={selected}
          onClose={() => setSelected(null)}
          onCountChange={(id, newCount) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, current_people: newCount } : p,
              ),
            );
            setSelected((prev) =>
              prev && prev.id === id
                ? { ...prev, current_people: newCount }
                : prev,
            );
          }}
        />
      )}
    </main>
  );
}

export default function SquadPage() {
  return (
    <Suspense>
      <SquadContent />
    </Suspense>
  );
}
