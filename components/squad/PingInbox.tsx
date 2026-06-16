"use client";
import { useState } from "react";
import ReasonChip from "./ReasonChip";
import { CATEGORY_COLORS } from "./SquadCard";
import { buildPingReason } from "@/lib/squad/ping-reason";
import { buildGeorgeImessageLink } from "@/lib/squad/george-link";
import type { PingRow } from "@/lib/squad/me-types";

export default function PingInbox({
  pings, onResponded,
}: { pings: PingRow[]; onResponded: (pingId: string, response: "joined" | "declined") => void }) {
  if (pings.length === 0) {
    return <p className="text-sm" style={{ color: "var(--mid)" }}>还没有人 ping 你 — 把 pings 打开就有机会被组局的人找到。</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {pings.map((p) => <PingCard key={p.ping_id} ping={p} onResponded={onResponded} />)}
    </div>
  );
}

function PingCard({ ping, onResponded }: { ping: PingRow; onResponded: (id: string, r: "joined" | "declined") => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"joined" | "declined" | null>(ping.response);
  const color = CATEGORY_COLORS[ping.category] ?? "#1a1410";
  const joinable = ping.status === "open";
  const reason = buildPingReason(ping.matched_tags, ping.best_facet);
  const label = `${ping.category}局${ping.location ? " " + ping.location : ""}`;
  const georgeLink = buildGeorgeImessageLink(label);

  async function respond(r: "joined" | "declined") {
    setBusy(true);
    try {
      const res = await fetch(`/api/squad/me/pings/${ping.ping_id}/respond`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: r }),
      });
      if (res.ok) { setDone(r); onResponded(ping.ping_id, r); }
    } finally { setBusy(false); }
  }

  return (
    <div className="brutal-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="brutal-tag font-display text-[11px]" style={{ background: color, color: "white", borderColor: color }}>{ping.category}</span>
        <span className="font-display text-sm" style={{ color: ping.status === "full" ? "var(--cardinal)" : "var(--black)" }}>
          {ping.current_people}/{ping.max_people} 人{ping.status === "full" ? " · 已满" : ""}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--black)" }}>{ping.content}</p>
      <ReasonChip reason={reason} />
      {done === "joined" ? (
        <div className="pt-3 border-t-[2px] border-[var(--black)] text-xs" style={{ color: "var(--black)" }}>
          已记下你的兴趣 ✓ —{" "}
          {georgeLink ? (
            <a href={georgeLink} className="font-display" style={{ color: "var(--cardinal)" }}>去 iMessage 找 george 报名 →</a>
          ) : (<span>iMessage george 帮你报名</span>)}
        </div>
      ) : done === "declined" ? (
        <p className="pt-3 border-t-[2px] border-[var(--black)] text-xs" style={{ color: "var(--mid)" }}>已忽略</p>
      ) : (
        <div className="pt-3 border-t-[2px] border-[var(--black)] flex gap-3">
          <button disabled={busy || !joinable} onClick={() => respond("joined")} className="brutal-btn brutal-btn-primary disabled:opacity-40">加入</button>
          <button disabled={busy} onClick={() => respond("declined")} className="brutal-btn disabled:opacity-40">忽略</button>
        </div>
      )}
    </div>
  );
}
