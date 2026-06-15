"use client";
import { useEffect, useState, useCallback } from "react";
import PingInbox from "./PingInbox";
import type { PingRow, MyPostRow, MyJoinedRow } from "@/lib/squad/me-types";

export default function MyActivity() {
  const [pings, setPings] = useState<PingRow[]>([]);
  const [posts, setPosts] = useState<MyPostRow[]>([]);
  const [joined, setJoined] = useState<MyJoinedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // No synchronous setLoading here: initial `loading` is already true, and
    // skipping it avoids a loading flash on focus-refetch (and the
    // set-state-synchronously-in-effect lint error).
    const [p, mp, mj] = await Promise.all([
      fetch("/api/squad/me/pings").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/squad/me/posts").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/squad/me/joined").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setPings(p); setPosts(mp); setJoined(mj); setLoading(false);
  }, []);

  // load() sets state only after an await (async fetch), not synchronously, so
  // this is not the cascading-render pattern the rule targets — standard fetch-on-mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const onResponded = (pingId: string, response: "joined" | "declined") =>
    setPings((prev) => prev.map((p) => (p.ping_id === pingId ? { ...p, response } : p)));

  if (loading) return <p className="text-sm" style={{ color: "var(--mid)" }}>加载中…</p>;

  return (
    <div className="flex flex-col gap-12">
      <Stream title="PINGS 收件箱" count={pings.filter((p) => p.response === null).length}>
        <PingInbox pings={pings} onResponded={onResponded} />
      </Stream>
      <Stream title="我的局">
        {posts.length === 0 ? <Empty text="你还没组过局。" /> : (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <li key={p.post_id} className="brutal-card p-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--black)" }}>{p.category} · {p.content.slice(0, 24)} · {p.status}</span>
                <span className="font-display text-xs" style={{ color: "var(--mid)" }}>已 ping {p.reach_count} 人</span>
              </li>
            ))}
          </ul>
        )}
      </Stream>
      <Stream title="已加入">
        {joined.length === 0 ? <Empty text="还没加入任何局。" /> : (
          <ul className="flex flex-col gap-3">
            {joined.map((p) => (
              <li key={p.post_id} className="brutal-card p-4 text-xs" style={{ color: "var(--black)" }}>{p.category} · {p.content.slice(0, 30)} · {p.status}</li>
            ))}
          </ul>
        )}
      </Stream>
    </div>
  );
}

function Stream({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-lg mb-4 flex items-center gap-2" style={{ color: "var(--black)" }}>
        {title}{count ? <span className="brutal-tag brutal-tag-filled">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm" style={{ color: "var(--mid)" }}>{text}</p>;
}
