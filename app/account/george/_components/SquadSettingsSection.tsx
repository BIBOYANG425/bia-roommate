"use client";
import { useState } from "react";
import type { MatchPrefs, MySignals } from "@/lib/squad/me-types";

const CATS = ["拼车", "自习", "约会", "健身", "游戏", "其它"];

export default function SquadSettingsSection({
  initialPrefs, initialSignals,
}: { initialPrefs: MatchPrefs; initialSignals: MySignals }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [tags, setTags] = useState(initialSignals.interest_tags);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePrefs(next: MatchPrefs) {
    setPrefs(next); setSaving(true);
    try {
      await fetch("/api/squad/prefs", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pings_enabled: next.pings_enabled, allowed_categories: next.allowed_categories,
          weekly_ping_cap: next.weekly_ping_cap, quiet_start_hour: next.quiet_start_hour,
          quiet_end_hour: next.quiet_end_hour, channel: next.channel,
        }),
      });
    } finally { setSaving(false); }
  }

  async function addTag() {
    const tag = draft.trim();
    if (!tag || tags.includes(tag)) { setDraft(""); return; }
    setTags((t) => [...t, tag]); setDraft("");
    await fetch("/api/squad/signals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tag }) });
  }
  async function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
    await fetch("/api/squad/signals", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ tag }) });
  }

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl" style={{ color: "var(--black)" }}>squad 接收设置</h2>

      {/* 匹配依据 */}
      <div className="brutal-card p-5 space-y-3">
        <p className="font-display text-sm" style={{ color: "var(--black)" }}>匹配依据 — george 用这些给你匹配局</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="brutal-tag flex items-center gap-1">
              {t.replace(/_/g, " ")}
              <button aria-label={`remove ${t}`} onClick={() => removeTag(t)} style={{ color: "var(--cardinal)" }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="加兴趣，比如 韩餐 / bouldering" className="brutal-input flex-1" />
          <button onClick={addTag} className="brutal-btn brutal-btn-gold">添加</button>
        </div>
      </div>

      {/* 接收控制 */}
      <div className="brutal-card p-5 space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--black)" }}>接收 pings（默认关，开了才会被组局的人找到）</span>
          <input type="checkbox" aria-label="接收 pings" checked={prefs.pings_enabled}
            onChange={(e) => savePrefs({ ...prefs, pings_enabled: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--black)" }}>每周最多</span>
          <input type="number" min={0} max={50} value={prefs.weekly_ping_cap} className="brutal-input w-20"
            onChange={(e) => savePrefs({ ...prefs, weekly_ping_cap: Number(e.target.value) })} />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm" style={{ color: "var(--black)" }}>免打扰</span>
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={23} value={prefs.quiet_start_hour} className="brutal-input w-16"
              onChange={(e) => savePrefs({ ...prefs, quiet_start_hour: Number(e.target.value) })} />
            <span>–</span>
            <input type="number" min={0} max={23} value={prefs.quiet_end_hour} className="brutal-input w-16"
              onChange={(e) => savePrefs({ ...prefs, quiet_end_hour: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: "var(--black)" }}>范围（不选 = 全部）</p>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => {
              const on = prefs.allowed_categories?.includes(c) ?? false;
              return (
                <button key={c}
                  onClick={() => {
                    const cur = prefs.allowed_categories ?? [];
                    const next = on ? cur.filter((x) => x !== c) : [...cur, c];
                    savePrefs({ ...prefs, allowed_categories: next.length ? next : null });
                  }}
                  className="brutal-tag" style={{ background: on ? "var(--black)" : "transparent", color: on ? "white" : "var(--mid)" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {saving && <p className="text-[11px]" style={{ color: "var(--mid)" }}>保存中…</p>}
      </div>
    </section>
  );
}
