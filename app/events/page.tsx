"use client";

// 活动 — student-facing events list with RSVP. Reads /api/events (public),
// RSVP toggles via /api/events/[id]/rsvp (auth required → AuthModal). Reuses the
// existing events / event_attendance tables (george-ingested + BIA events);
// RSVP state lives in event_attendance.rsvped_at (not the legacy source column).
// All DB access goes through anon/user client + SECURITY DEFINER RPCs. The RPC
// rejects full (event_full) / non-active (event_not_open) events → 409 here.

import { useEffect, useState } from "react";
import NavTabs from "@/components/NavTabs";
import AuthModal from "@/components/AuthModal";
import Toast from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  end_date: string | null;
  location: string | null;
  category: string | null;
  source: string;
  source_url: string | null;
  image_url: string | null;
  capacity: number | null;
  rsvp_count: number;
  is_rsvped: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  bia: "BIA",
  usc: "USC",
  instagram: "IG",
  community: "社区",
};

function fmtDate(s: string | null): string {
  if (!s) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) setEvents((await res.json()) as EventRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleRsvp(ev: EventRow) {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (busy) return;
    setBusy(ev.id);
    const going = !ev.is_rsvped;
    // Optimistic update.
    setEvents((list) =>
      list.map((e) =>
        e.id === ev.id
          ? { ...e, is_rsvped: going, rsvp_count: e.rsvp_count + (going ? 1 : -1) }
          : e,
      ),
    );
    try {
      const res = await fetch(`/api/events/${ev.id}/rsvp`, {
        method: going ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "rsvp failed");
      }
      setToast(going ? "已报名 — 到时见 🎉" : "已取消报名");
    } catch (err) {
      // Revert on failure.
      setEvents((list) =>
        list.map((e) =>
          e.id === ev.id
            ? { ...e, is_rsvped: !going, rsvp_count: e.rsvp_count + (going ? -1 : 1) }
            : e,
        ),
      );
      const code = err instanceof Error ? err.message : "";
      if (code === "event_full") {
        setToast("这个活动已经满员了 😢");
        load(); // 本地的名额数已过期，重新拉取
      } else if (code === "event_not_open") {
        setToast("这个活动暂不开放报名");
        load();
      } else {
        setToast("操作失败，请重试");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <NavTabs />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 border-b-[3px] border-[var(--black)] pb-2">
          <h1 className="font-display text-[32px]" style={{ color: "var(--black)" }}>
            活动
          </h1>
          <p className="text-xs" style={{ color: "var(--mid)" }}>
            USC + BIA 最近的活动 · 报名了别错过
          </p>
        </div>

        {loading ? (
          <p
            className="font-display text-sm tracking-[0.2em]"
            style={{ color: "var(--mid)" }}
          >
            LOADING...
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            最近暂无活动，过几天再来看看
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((e) => (
              <div
                key={e.id}
                className="brutal-container p-4"
                style={{ background: "var(--cream)" }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
                        style={{ color: "var(--black)" }}
                      >
                        {SOURCE_LABEL[e.source] ?? e.source}
                      </span>
                      {e.category && (
                        <span className="text-[11px]" style={{ color: "var(--mid)" }}>
                          {e.category}
                        </span>
                      )}
                    </div>
                    <h2
                      className="font-display text-xl mt-1"
                      style={{ color: "var(--black)" }}
                    >
                      {e.title}
                    </h2>
                    <div className="text-xs mt-1" style={{ color: "var(--mid)" }}>
                      {fmtDate(e.date)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRsvp(e)}
                    disabled={busy === e.id}
                    className="brutal-btn whitespace-nowrap"
                    style={
                      e.is_rsvped
                        ? { background: "var(--black)", color: "white" }
                        : { background: "var(--cardinal)", color: "white" }
                    }
                  >
                    {e.is_rsvped ? "已报名 ✓" : "报名"}
                  </button>
                </div>
                {e.description && (
                  <p
                    className="text-sm mt-2 whitespace-pre-wrap"
                    style={{ color: "var(--black)" }}
                  >
                    {e.description}
                  </p>
                )}
                <div
                  className="flex items-center gap-3 mt-2 text-[11px]"
                  style={{ color: "var(--mid)" }}
                >
                  <span>
                    {e.rsvp_count} 人报名
                    {e.capacity ? ` / ${e.capacity}` : ""}
                  </span>
                  {e.source_url && (
                    <a
                      href={e.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      详情
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          load();
        }}
      />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}
