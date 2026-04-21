"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NavTabs from "@/components/NavTabs";
import type {
  CourseAggregate,
  CourseRankingSort,
  RankingsResponse,
} from "@/lib/course-rating/types";

const SORT_OPTIONS: { value: CourseRankingSort; label: string; hint: string }[] =
  [
    { value: "grading", label: "给分", hint: "Avg. grading (high → low)" },
    { value: "reviews", label: "评价数", hint: "Most reviewed" },
    { value: "difficulty", label: "难度", hint: "Difficulty (high → low)" },
    { value: "workload", label: "工作量", hint: "Workload (high → low)" },
    { value: "recent", label: "最近更新", hint: "Recently reviewed" },
  ];

type RowMeta = { title?: string; units?: string };

function metaKey(dept: string, num: string) {
  return `${dept}-${num}`;
}

function normalizeSort(raw: string | null): CourseRankingSort {
  const v = (raw || "grading").toLowerCase();
  return SORT_OPTIONS.some((o) => o.value === v)
    ? (v as CourseRankingSort)
    : "grading";
}

function CourseRankingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = normalizeSort(searchParams.get("sort"));
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);

  const [payload, setPayload] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowMeta, setRowMeta] = useState<Record<string, RowMeta>>({});

  const setQuery = useCallback(
    (next: { sort?: CourseRankingSort; page?: number }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next.sort !== undefined) p.set("sort", next.sort);
      if (next.page !== undefined) {
        if (next.page <= 1) p.delete("page");
        else p.set("page", String(next.page));
      }
      const qs = p.toString();
      router.push(qs ? `/course-rating/rankings?${qs}` : "/course-rating/rankings");
    },
    [router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("page", String(page));
    sp.set("pageSize", "48");
    const qs = sp.toString();

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      fetch(`/api/course-rating/rankings?${qs}`)
        .then(async (r) => {
          if (!r.ok) throw new Error("Failed to load");
          return r.json() as Promise<RankingsResponse>;
        })
        .then((data) => {
          if (!cancelled) setPayload(data);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Could not load rankings.");
            setPayload(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [sort, page]);

  const rows = payload?.rows ?? [];

  useEffect(() => {
    const list = payload?.rows;
    if (!list || list.length === 0) {
      queueMicrotask(() => setRowMeta({}));
      return;
    }
    const courses = list;
    let cancelled = false;

    async function loadTitles() {
      const results = await Promise.all(
        courses.map(async (agg: CourseAggregate) => {
          const key = metaKey(agg.dept, agg.course_number);
          try {
            const r = await fetch(
              `/api/courses/${encodeURIComponent(agg.dept)}/${encodeURIComponent(agg.course_number)}`,
            );
            if (!r.ok) return { key, meta: null as RowMeta | null };
            const d = (await r.json()) as { title?: string; units?: string };
            const title = (d.title || "").trim();
            const units = (d.units || "").trim();
            if (!title && !units) return { key, meta: null };
            return {
              key,
              meta: {
                ...(title ? { title } : {}),
                ...(units ? { units } : {}),
              },
            };
          } catch {
            return { key, meta: null as RowMeta | null };
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, RowMeta> = {};
      for (const { key, meta } of results) {
        if (meta) next[key] = meta;
      }
      setRowMeta(next);
    }

    loadTitles();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const totalPages = useMemo(() => {
    if (!payload) return 1;
    return Math.max(1, Math.ceil(payload.total / payload.pageSize));
  }, [payload]);

  const rankBase = payload ? (payload.page - 1) * payload.pageSize : 0;

  return (
    <main className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <NavTabs />

      <div
        className="border-b-[3px] border-[var(--black)] px-6 py-5"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-5xl mx-auto">
          <Link
            href="/course-rating"
            className="font-display text-xs tracking-wider text-white/70 hover:text-white mb-3 inline-block"
          >
            ← BACK TO 课评
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-1">
            全部排行
          </h1>
          <p className="text-sm text-white/60">
            ALL COURSE RANKINGS — PAGINATED & SORTABLE
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <label
              className="font-display text-sm tracking-wider mb-2 block"
              style={{ color: "var(--cardinal)" }}
            >
              SORT BY
            </label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  title={o.hint}
                  onClick={() => setQuery({ sort: o.value, page: 1 })}
                  className="px-3 py-1.5 text-xs font-display tracking-wider border-[2px] transition-all"
                  style={{
                    borderColor: "var(--black)",
                    background: sort === o.value ? "var(--cardinal)" : "white",
                    color: sort === o.value ? "white" : "var(--black)",
                    borderRadius: "16px",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {payload && !loading && (
            <p className="font-mono text-[11px] text-[var(--mid)]">
              {payload.total} course
              {payload.total !== 1 ? "s" : ""} with reviews · Page {payload.page}{" "}
              of {totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <div className="border-[3px] border-[var(--black)] p-12 text-center font-mono text-sm text-[var(--mid)]">
            Loading…
          </div>
        ) : error ? (
          <div
            className="border-[3px] border-[var(--cardinal)] p-8 text-center"
            style={{ background: "var(--cream)" }}
          >
            <p className="font-mono text-sm text-[var(--cardinal)] mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="brutal-btn text-sm"
            >
              RETRY
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div
            className="border-[3px] border-[var(--black)] p-8 text-center"
            style={{ background: "var(--cream)" }}
          >
            <p className="font-display text-lg mb-2">NO RANKINGS YET</p>
            <p className="font-mono text-[11px] text-[var(--mid)] mb-4">
              还没有带评价的课程排行
            </p>
            <Link href="/course-rating" className="brutal-btn brutal-btn-primary text-sm inline-block">
              WRITE A REVIEW
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-[3px] border-[var(--black)]">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr style={{ background: "var(--cream)" }}>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)] w-12">
                      #
                    </th>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)]">
                      COURSE
                    </th>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)]">
                      难度
                    </th>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)]">
                      工作量
                    </th>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)]">
                      给分
                    </th>
                    <th className="font-display text-[11px] tracking-wider p-3 border-b-[2px] border-[var(--black)]">
                      N
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((agg: CourseAggregate, i: number) => {
                    const mk = metaKey(agg.dept, agg.course_number);
                    const meta = rowMeta[mk];
                    const rank = rankBase + i + 1;
                    return (
                      <tr
                        key={`${agg.dept}-${agg.course_number}`}
                        className="hover:bg-[var(--cream)] transition-colors"
                      >
                        <td className="font-mono text-[11px] p-3 border-b border-[var(--beige)] text-[var(--mid)]">
                          {rank}
                        </td>
                        <td className="p-3 border-b border-[var(--beige)]">
                          <Link
                            href={`/course-rating/${agg.dept}/${agg.course_number}`}
                            className="group block"
                          >
                            <span
                              className="font-display text-sm group-hover:underline"
                              style={{ color: "var(--cardinal)" }}
                            >
                              {agg.dept} {agg.course_number}
                            </span>
                            {meta?.units && (
                              <span className="brutal-tag brutal-tag-gold text-[8px] ml-2 align-middle">
                                {meta.units}u
                              </span>
                            )}
                            {meta?.title && (
                              <span
                                className="block font-mono text-[10px] text-[var(--black)] mt-0.5 line-clamp-2 max-w-md"
                              >
                                {meta.title}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="font-mono text-[11px] p-3 border-b border-[var(--beige)]">
                          {Number(agg.avg_difficulty).toFixed(1)}
                        </td>
                        <td className="font-mono text-[11px] p-3 border-b border-[var(--beige)]">
                          {Number(agg.avg_workload).toFixed(1)}
                        </td>
                        <td className="font-mono text-[11px] p-3 border-b border-[var(--beige)]">
                          {Number(agg.avg_grading).toFixed(1)}
                        </td>
                        <td className="font-mono text-[11px] p-3 border-b border-[var(--beige)] text-[var(--mid)]">
                          {agg.review_count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {payload && totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setQuery({ page: page - 1 })}
                  className="brutal-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  PREV
                </button>
                <span className="font-mono text-[11px] text-[var(--mid)]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setQuery({ page: page + 1 })}
                  className="brutal-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  NEXT
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          BIA 课评 — ALL RANKINGS
        </p>
      </footer>
    </main>
  );
}

function RankingsFallback() {
  return (
    <main className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <NavTabs />
      <div
        className="border-b-[3px] border-[var(--black)] px-6 py-5"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-5xl mx-auto h-24 animate-pulse bg-white/10 rounded" />
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="border-[3px] border-[var(--black)] p-12 text-center font-mono text-sm text-[var(--mid)]">
          Loading…
        </div>
      </div>
    </main>
  );
}

export default function CourseRankingsPage() {
  return (
    <Suspense fallback={<RankingsFallback />}>
      <CourseRankingsContent />
    </Suspense>
  );
}
