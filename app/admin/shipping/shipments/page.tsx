"use client";

// Admin shipment list + inline create form.

import { useEffect, useState } from "react";
import Link from "next/link";
import Field from "@/components/admin/Field";
import type { Shipment } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // load() is used for post-create refresh from event handlers.
  const load = async () => {
    const res = await fetch("/api/admin/shipping/shipments", {
      cache: "no-store",
    });
    if (res.ok) setShipments((await res.json()) as Shipment[]);
    setLoading(false);
  };

  // Initial fetch — inline with cancelled flag keeps the effect body free
  // of any synchronously-reachable setState (the lint rule traces through
  // function calls, so a bare `load()` trips it).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/shipping/shipments", {
        cache: "no-store",
      });
      if (cancelled) return;
      if (res.ok) setShipments((await res.json()) as Shipment[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createShipment = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/shipping/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), carrier, notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "创建失败");
      return;
    }
    setName("");
    setCarrier("");
    setNotes("");
    setShowCreate(false);
    setToast("已创建");
    setTimeout(() => setToast(null), 1500);
    await load();
  };

  return (
    <>
      {toast && (
        <div
          className="fixed top-20 right-4 z-50 px-4 py-2 border-[3px] border-[var(--black)] font-display text-sm"
          style={{ background: "var(--gold)", color: "var(--black)" }}
        >
          {toast}
        </div>
      )}

      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 border-b-[3px] border-[var(--black)] pb-2">
        <h1
          className="font-display text-[32px]"
          style={{ color: "var(--black)" }}
        >
          SHIPMENTS
        </h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="brutal-btn"
          style={{ background: "var(--cardinal)", color: "white" }}
        >
          {showCreate ? "取消" : "+ NEW SHIPMENT"}
        </button>
      </div>

      {showCreate && (
        <section
          className="brutal-container p-5 mb-6"
          style={{ background: "var(--beige)" }}
        >
          <h2
            className="font-display text-lg tracking-[0.15em] mb-3"
            style={{ color: "var(--black)" }}
          >
            CREATE SHIPMENT
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Field label="NAME">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 2026-04-20-海运第一批"
                className="brutal-input"
              />
            </Field>
            <Field label="CARRIER (可选)">
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="如 DHL / 顺丰速运"
                className="brutal-input"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="NOTES (可选)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="brutal-input resize-none"
                />
              </Field>
            </div>
          </div>
          <button
            type="button"
            onClick={createShipment}
            disabled={!name.trim() || saving}
            className="brutal-btn mt-4"
            style={
              name.trim() && !saving
                ? { background: "var(--cardinal)", color: "white" }
                : { background: "var(--cream)", color: "var(--mid)" }
            }
          >
            {saving ? "创建中..." : "创建"}
          </button>
        </section>
      )}

      {loading ? (
        <p
          className="font-display text-sm tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      ) : shipments.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--mid)" }}>
          还没有批次。点「+ NEW SHIPMENT」创建第一个。
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shipments.map((s) => (
            <Link
              key={s.id}
              href={`/admin/shipping/shipments/${s.id}`}
              className="brutal-container p-4 hover:-translate-y-0.5 transition-transform"
              style={{ background: "var(--cream)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3
                  className="font-display text-base tracking-[0.1em]"
                  style={{ color: "var(--black)" }}
                >
                  {s.name}
                </h3>
                <span
                  className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
                  style={{
                    background:
                      s.status === "archived"
                        ? "var(--beige)"
                        : s.status === "pickup_closed"
                          ? "#1c6f3d"
                          : "var(--gold)",
                    color: s.status === "pickup_closed" ? "white" : "var(--black)",
                  }}
                >
                  {s.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--mid)" }}>
                {s.carrier ? `${s.carrier} · ` : ""}
                {relativeTime(s.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
