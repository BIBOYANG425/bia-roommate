"use client";

// Admin parcel detail — edit status, weight, dims, notes, received_at.
// All writes go through /api/admin/shipping/parcels/[id] PATCH, which uses
// the admin_patch_parcel RPC so the event log tags actor_role='admin'.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Field from "@/components/admin/Field";
import ParcelStatusPill from "@/components/ParcelStatusPill";
import StatusProgress from "@/components/StatusProgress";
import {
  PARCEL_STATUS_META,
  PARCEL_STATUS_VALUES,
  SHIPPING_METHOD_META,
  type Parcel,
  type ParcelEvent,
  type ParcelStatus,
  type Shipment,
} from "@/lib/types";
import {
  PARCEL_STEPS,
  PARCEL_BRANCH_STATUSES,
  nextParcelStatus,
} from "@/lib/admin/parcel-status";
import { relativeTime } from "@/lib/utils";

export default function AdminParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [events, setEvents] = useState<ParcelEvent[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft values
  const [draftStatus, setDraftStatus] = useState<ParcelStatus | "">("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftL, setDraftL] = useState("");
  const [draftW, setDraftW] = useState("");
  const [draftH, setDraftH] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadParcel = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/shipping/parcels/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError(res.status === 404 ? "包裹不存在" : "加载失败");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      parcel: Parcel;
      events: ParcelEvent[];
      shipment: Shipment | null;
    };
    setParcel(data.parcel);
    setEvents(data.events);
    setShipment(data.shipment);
    setDraftStatus(data.parcel.status);
    setDraftWeight(
      data.parcel.weight_grams !== null ? String(data.parcel.weight_grams) : "",
    );
    setDraftL(data.parcel.dim_cm_l !== null ? String(data.parcel.dim_cm_l) : "");
    setDraftW(data.parcel.dim_cm_w !== null ? String(data.parcel.dim_cm_w) : "");
    setDraftH(data.parcel.dim_cm_h !== null ? String(data.parcel.dim_cm_h) : "");
    setDraftNotes(data.parcel.notes ?? "");

    // Sign photo URLs (private bucket)
    const paths = data.parcel.photos ?? [];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("parcel-photos")
        .createSignedUrls(paths, 60 * 60);
      setPhotoUrls(
        (signed ?? [])
          .map((s: { signedUrl: string | null }) => s?.signedUrl ?? "")
          .filter((u: string) => u.length > 0),
      );
    } else {
      setPhotoUrls([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadParcel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/shipping/parcels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error ?? "保存失败");
      return;
    }
    setToast("已保存");
    setTimeout(() => setToast(null), 1500);
    await loadParcel();
  };

  const handleSaveAll = async () => {
    if (!parcel) return;
    const patch: Record<string, unknown> = {};
    if (draftStatus && draftStatus !== parcel.status) patch.status = draftStatus;
    if (draftWeight !== String(parcel.weight_grams ?? "")) {
      patch.weight_grams = draftWeight;
    }
    if (draftL !== String(parcel.dim_cm_l ?? "")) patch.dim_cm_l = draftL;
    if (draftW !== String(parcel.dim_cm_w ?? "")) patch.dim_cm_w = draftW;
    if (draftH !== String(parcel.dim_cm_h ?? "")) patch.dim_cm_h = draftH;
    if (draftNotes !== (parcel.notes ?? "")) patch.notes = draftNotes;
    // If flipping to received_cn and received_at isn't set, stamp now
    if (draftStatus === "received_cn" && !parcel.received_at) {
      patch.received_at = new Date().toISOString();
    }
    if (Object.keys(patch).length === 0) {
      setToast("没有改动");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    await handleSave(patch);
  };

  const handleBumpNext = async () => {
    if (!parcel) return;
    const next = nextParcelStatus(parcel.status);
    if (!next) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === "received_cn" && !parcel.received_at) {
      patch.received_at = new Date().toISOString();
    }
    await handleSave(patch);
  };

  if (loading) {
    return (
      <p
        className="font-display text-sm tracking-[0.2em]"
        style={{ color: "var(--mid)" }}
      >
        LOADING...
      </p>
    );
  }
  if (error || !parcel) {
    return (
      <p className="text-sm" style={{ color: "var(--cardinal)" }}>
        {error ?? "未找到"}
      </p>
    );
  }

  const next = nextParcelStatus(parcel.status);
  const steps = PARCEL_STEPS.map((k) => ({
    key: k,
    label: PARCEL_STATUS_META[k].label,
  }));
  const branches = PARCEL_BRANCH_STATUSES.map((k) => ({
    key: k,
    label: PARCEL_STATUS_META[k].label,
  }));

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

      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <Link
            href="/admin/shipping/parcels"
            className="font-display text-[11px] tracking-[0.2em]"
            style={{ color: "var(--mid)" }}
          >
            ← PARCELS
          </Link>
          <h1
            className="font-display text-[28px] mt-1 leading-tight"
            style={{ color: "var(--black)" }}
          >
            {parcel.description}
          </h1>
          <div
            className="flex items-center gap-2 mt-1 text-xs"
            style={{ color: "var(--mid)" }}
          >
            <span className="font-display tracking-wider">{parcel.member_id}</span>
            {parcel.shipping_method && (
              <span>
                · {SHIPPING_METHOD_META[parcel.shipping_method].icon}{" "}
                {SHIPPING_METHOD_META[parcel.shipping_method].label}
              </span>
            )}
          </div>
        </div>
        <ParcelStatusPill status={parcel.status} />
      </div>

      {/* Progress */}
      <section className="mb-6">
        <StatusProgress
          steps={steps}
          current={parcel.status}
          branches={branches}
        />
      </section>

      {/* Editor */}
      <section
        className="brutal-container p-5 mb-6"
        style={{ background: "var(--beige)" }}
      >
        <h2
          className="font-display text-lg tracking-[0.15em] mb-3"
          style={{ color: "var(--black)" }}
        >
          EDIT
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="STATUS">
            <select
              value={draftStatus}
              onChange={(e) =>
                setDraftStatus(e.target.value as ParcelStatus)
              }
              className="brutal-input"
            >
              {PARCEL_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {PARCEL_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="WEIGHT (GRAMS)">
            <input
              type="number"
              value={draftWeight}
              onChange={(e) => setDraftWeight(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="LENGTH (CM)">
            <input
              type="number"
              step="0.1"
              value={draftL}
              onChange={(e) => setDraftL(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="WIDTH (CM)">
            <input
              type="number"
              step="0.1"
              value={draftW}
              onChange={(e) => setDraftW(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="HEIGHT (CM)">
            <input
              type="number"
              step="0.1"
              value={draftH}
              onChange={(e) => setDraftH(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ADMIN NOTES">
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={2}
                className="brutal-input resize-none"
                placeholder="仓库备注 / 尺寸异常 / 处理记录"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="brutal-btn"
            style={{ background: "var(--cardinal)", color: "white" }}
          >
            {saving ? "保存中..." : "保存所有修改"}
          </button>
          {next && (
            <button
              type="button"
              onClick={handleBumpNext}
              disabled={saving}
              className="brutal-btn"
              style={{ background: "var(--gold)", color: "var(--black)" }}
            >
              → 推进到「{PARCEL_STATUS_META[next].label}」
            </button>
          )}
        </div>
      </section>

      {/* Shipment info */}
      {shipment && (
        <section
          className="brutal-container p-5 mb-6"
          style={{ background: "var(--cream)" }}
        >
          <h2
            className="font-display text-lg tracking-[0.15em] mb-2"
            style={{ color: "var(--black)" }}
          >
            SHIPMENT
          </h2>
          <p className="text-sm" style={{ color: "var(--black)" }}>
            <Link
              href={`/admin/shipping/shipments/${shipment.id}`}
              className="underline"
            >
              {shipment.name}
            </Link>
            <span className="text-xs ml-2" style={{ color: "var(--mid)" }}>
              [{shipment.status}]
            </span>
          </p>
        </section>
      )}

      {/* Photos */}
      {photoUrls.length > 0 && (
        <section className="mb-6">
          <h2
            className="font-display text-lg tracking-[0.15em] mb-2"
            style={{ color: "var(--black)" }}
          >
            PHOTOS
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {photoUrls.map((url, idx) => (
              <Image
                key={idx}
                src={url}
                alt={`Photo ${idx + 1}`}
                width={300}
                height={200}
                unoptimized
                className="w-full h-28 object-cover border-[3px] border-[var(--black)]"
              />
            ))}
          </div>
        </section>
      )}

      {/* Event log */}
      <section
        className="brutal-container p-5"
        style={{ background: "var(--cream)" }}
      >
        <h2
          className="font-display text-lg tracking-[0.15em] mb-3"
          style={{ color: "var(--black)" }}
        >
          TIMELINE
        </h2>
        {events.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--mid)" }}>
            暂无事件
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <span
                  className="font-display text-[10px] tracking-wider whitespace-nowrap pt-0.5"
                  style={{ color: "var(--mid)" }}
                >
                  {relativeTime(ev.created_at)}
                </span>
                <div className="flex-1">
                  <span style={{ color: "var(--black)" }}>
                    {ev.from_status
                      ? `${PARCEL_STATUS_META[ev.from_status].label} → ${PARCEL_STATUS_META[ev.to_status].label}`
                      : PARCEL_STATUS_META[ev.to_status].label}
                  </span>
                  <span
                    className="font-display text-[10px] tracking-wider ml-2"
                    style={{ color: "var(--mid)" }}
                  >
                    [{ev.actor_role}]
                  </span>
                  {ev.note && (
                    <p className="text-xs mt-1" style={{ color: "var(--mid)" }}>
                      {ev.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
