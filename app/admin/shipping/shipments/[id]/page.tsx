"use client";

// Admin shipment detail — edit fields, see attached parcels, run attach flow,
// visualize batch progress, advance status one step.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Field from "@/components/admin/Field";
import StatusProgress from "@/components/StatusProgress";
import BatchProgress from "@/components/BatchProgress";
import ParcelStatusPill from "@/components/ParcelStatusPill";
import {
  SHIPMENT_STATUS_VALUES,
  SHIPPING_METHOD_META,
  type Parcel,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/types";
import {
  SHIPMENT_STEPS,
  nextShipmentStatus,
} from "@/lib/admin/shipment-status";

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  forming: "组建中",
  sealed: "已封箱",
  departed_cn: "国内发出",
  customs: "清关中",
  arrived_us: "到达美国",
  pickup_open: "可取件",
  pickup_closed: "已关闭",
  archived: "已归档",
};

function toLocalInput(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export default function AdminShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [unassigned, setUnassigned] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Draft fields
  const [draftName, setDraftName] = useState("");
  const [draftStatus, setDraftStatus] = useState<ShipmentStatus>("forming");
  const [draftCarrier, setDraftCarrier] = useState("");
  const [draftTracking, setDraftTracking] = useState("");
  const [draftDeparted, setDraftDeparted] = useState("");
  const [draftArrived, setDraftArrived] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  // Attach flow
  const [showAttach, setShowAttach] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [res, unassignedRes] = await Promise.all([
      fetch(`/api/admin/shipping/shipments/${id}`, { cache: "no-store" }),
      fetch(
        `/api/admin/shipping/parcels?shipment_id=null&status=received_cn&limit=200`,
        { cache: "no-store" },
      ),
    ]);
    if (!res.ok) {
      setError(res.status === 404 ? "批次不存在" : "加载失败");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      shipment: Shipment;
      parcels: Parcel[];
    };
    setShipment(data.shipment);
    setParcels(data.parcels);
    setDraftName(data.shipment.name);
    setDraftStatus(data.shipment.status);
    setDraftCarrier(data.shipment.carrier ?? "");
    setDraftTracking(data.shipment.international_tracking ?? "");
    setDraftDeparted(toLocalInput(data.shipment.departed_cn_at));
    setDraftArrived(toLocalInput(data.shipment.arrived_us_at));
    setDraftLocation(data.shipment.pickup_location ?? "");
    setDraftStart(toLocalInput(data.shipment.pickup_starts_at));
    setDraftEnd(toLocalInput(data.shipment.pickup_ends_at));
    setDraftPrice(
      data.shipment.price_per_kg_cents !== null
        ? String(data.shipment.price_per_kg_cents)
        : "",
    );
    setDraftNotes(data.shipment.notes ?? "");

    if (unassignedRes.ok) {
      const u = (await unassignedRes.json()) as { parcels: Parcel[] };
      setUnassigned(u.parcels);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patchShipment = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/admin/shipping/shipments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "保存失败");
      return false;
    }
    setToast("已保存");
    setTimeout(() => setToast(null), 1500);
    await load();
    return true;
  };

  const saveAll = async () => {
    if (!shipment) return;
    const patch: Record<string, unknown> = {};
    if (draftName !== shipment.name) patch.name = draftName;
    if (draftStatus !== shipment.status) patch.status = draftStatus;
    if (draftCarrier !== (shipment.carrier ?? "")) patch.carrier = draftCarrier;
    if (draftTracking !== (shipment.international_tracking ?? ""))
      patch.international_tracking = draftTracking;
    if (fromLocalInput(draftDeparted) !== shipment.departed_cn_at)
      patch.departed_cn_at = fromLocalInput(draftDeparted);
    if (fromLocalInput(draftArrived) !== shipment.arrived_us_at)
      patch.arrived_us_at = fromLocalInput(draftArrived);
    if (draftLocation !== (shipment.pickup_location ?? ""))
      patch.pickup_location = draftLocation;
    if (fromLocalInput(draftStart) !== shipment.pickup_starts_at)
      patch.pickup_starts_at = fromLocalInput(draftStart);
    if (fromLocalInput(draftEnd) !== shipment.pickup_ends_at)
      patch.pickup_ends_at = fromLocalInput(draftEnd);
    const currentPrice =
      shipment.price_per_kg_cents !== null
        ? String(shipment.price_per_kg_cents)
        : "";
    if (draftPrice !== currentPrice) {
      patch.price_per_kg_cents = draftPrice === "" ? null : Number(draftPrice);
    }
    if (draftNotes !== (shipment.notes ?? "")) patch.notes = draftNotes;

    if (Object.keys(patch).length === 0) {
      setToast("没有改动");
      setTimeout(() => setToast(null), 1200);
      return;
    }
    await patchShipment(patch);
  };

  const bumpNext = async () => {
    if (!shipment) return;
    const next = nextShipmentStatus(shipment.status);
    if (!next) return;
    await patchShipment({ status: next });
  };

  const toggleSelected = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const attachSelected = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const res = await fetch(`/api/admin/shipping/shipments/${id}/attach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcel_ids: Array.from(selected) }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "附加失败");
      return;
    }
    const data = (await res.json()) as { updated: number };
    setToast(`已附加 ${data.updated} 个`);
    setTimeout(() => setToast(null), 1500);
    setSelected(new Set());
    setShowAttach(false);
    await load();
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
  if (error || !shipment) {
    return (
      <p className="text-sm" style={{ color: "var(--cardinal)" }}>
        {error ?? "未找到"}
      </p>
    );
  }

  const next = nextShipmentStatus(shipment.status);
  const steps = SHIPMENT_STEPS.map((k) => ({
    key: k,
    label: SHIPMENT_STATUS_LABELS[k],
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

      <Link
        href="/admin/shipping/shipments"
        className="font-display text-[11px] tracking-[0.2em]"
        style={{ color: "var(--mid)" }}
      >
        ← SHIPMENTS
      </Link>
      <h1
        className="font-display text-[32px] mt-1 mb-4 leading-tight"
        style={{ color: "var(--black)" }}
      >
        {shipment.name}
      </h1>

      {/* Progress */}
      <section className="mb-6">
        <StatusProgress steps={steps} current={shipment.status} />
        {next && (
          <button
            type="button"
            onClick={bumpNext}
            disabled={saving}
            className="brutal-btn mt-3"
            style={{ background: "var(--gold)", color: "var(--black)" }}
          >
            → 推进到「{SHIPMENT_STATUS_LABELS[next]}」
          </button>
        )}
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
          DETAILS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="NAME">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="STATUS">
            <select
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value as ShipmentStatus)}
              className="brutal-input"
            >
              {SHIPMENT_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {SHIPMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CARRIER">
            <input
              type="text"
              value={draftCarrier}
              onChange={(e) => setDraftCarrier(e.target.value)}
              placeholder="如 DHL"
              className="brutal-input"
            />
          </Field>
          <Field label="INTL TRACKING">
            <input
              type="text"
              value={draftTracking}
              onChange={(e) => setDraftTracking(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="DEPARTED CN AT">
            <input
              type="datetime-local"
              value={draftDeparted}
              onChange={(e) => setDraftDeparted(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="ARRIVED US AT">
            <input
              type="datetime-local"
              value={draftArrived}
              onChange={(e) => setDraftArrived(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="PICKUP LOCATION">
            <input
              type="text"
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              placeholder="如 THH 301, USC"
              className="brutal-input"
            />
          </Field>
          <Field label="PRICE/KG (CENTS)">
            <input
              type="number"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="PICKUP STARTS">
            <input
              type="datetime-local"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <Field label="PICKUP ENDS">
            <input
              type="datetime-local"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="brutal-input"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="NOTES">
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={2}
                className="brutal-input resize-none"
              />
            </Field>
          </div>
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="brutal-btn mt-4"
          style={{ background: "var(--cardinal)", color: "white" }}
        >
          {saving ? "保存中..." : "保存所有修改"}
        </button>
      </section>

      {/* Batch progress */}
      <section
        className="brutal-container p-5 mb-6"
        style={{ background: "var(--cream)" }}
      >
        <h2
          className="font-display text-lg tracking-[0.15em] mb-3"
          style={{ color: "var(--black)" }}
        >
          BATCH PROGRESS ({parcels.length} parcels)
        </h2>
        <BatchProgress parcels={parcels} />
      </section>

      {/* Attached parcels + attach flow */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h2
            className="font-display text-lg tracking-[0.15em]"
            style={{ color: "var(--black)" }}
          >
            ATTACHED PARCELS
          </h2>
          <button
            type="button"
            onClick={() => setShowAttach((v) => !v)}
            className="brutal-btn"
            style={{ background: "var(--gold)", color: "var(--black)" }}
          >
            {showAttach
              ? "取消"
              : `+ ATTACH (${unassigned.length} 待关联)`}
          </button>
        </div>

        {showAttach && (
          <div
            className="brutal-container p-4 mb-4"
            style={{ background: "var(--beige)" }}
          >
            <p
              className="text-[11px] mb-3"
              style={{ color: "var(--mid)" }}
            >
              选择待关联的 received_cn 包裹 · 附加后自动推进到 in_transit
            </p>
            {unassigned.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--mid)" }}>
                没有已签收但未关联批次的包裹
              </p>
            ) : (
              <>
                <ul className="space-y-1 max-h-80 overflow-y-auto">
                  {unassigned.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--cream)] px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                        />
                        <span
                          className="font-display tracking-wider"
                          style={{ color: "var(--black)" }}
                        >
                          {p.member_id}
                        </span>
                        <span
                          className="flex-1 truncate"
                          style={{ color: "var(--mid)" }}
                        >
                          {p.description}
                        </span>
                        {p.shipping_method && (
                          <span style={{ color: "var(--mid)" }}>
                            {SHIPPING_METHOD_META[p.shipping_method].icon}
                          </span>
                        )}
                        {p.weight_grams && (
                          <span style={{ color: "var(--mid)" }}>
                            {(p.weight_grams / 1000).toFixed(1)}kg
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={attachSelected}
                  disabled={selected.size === 0 || saving}
                  className="brutal-btn mt-3"
                  style={
                    selected.size > 0 && !saving
                      ? { background: "var(--cardinal)", color: "white" }
                      : { background: "var(--cream)", color: "var(--mid)" }
                  }
                >
                  附加 {selected.size} 个包裹
                </button>
              </>
            )}
          </div>
        )}

        {parcels.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--mid)" }}>
            这个批次还没有包裹
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr
                  className="font-display text-[10px] tracking-wider"
                  style={{ color: "var(--mid)" }}
                >
                  <th className="text-left py-2 pr-3">MEMBER</th>
                  <th className="text-left py-2 pr-3">DESCRIPTION</th>
                  <th className="text-left py-2 pr-3">STATUS</th>
                  <th className="text-left py-2 pr-3">重量</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t-[2px] border-[var(--beige)] hover:bg-[var(--beige)]"
                  >
                    <td className="py-2 pr-3">
                      <Link
                        href={`/admin/shipping/parcels/${p.id}`}
                        className="font-display text-xs tracking-wider underline"
                        style={{ color: "var(--black)" }}
                      >
                        {p.member_id}
                      </Link>
                    </td>
                    <td
                      className="py-2 pr-3 max-w-[220px] truncate"
                      style={{ color: "var(--black)" }}
                    >
                      {p.description}
                    </td>
                    <td className="py-2 pr-3">
                      <ParcelStatusPill status={p.status} size="sm" />
                    </td>
                    <td
                      className="py-2 pr-3 text-xs"
                      style={{ color: "var(--mid)" }}
                    >
                      {p.weight_grams
                        ? `${(p.weight_grams / 1000).toFixed(1)} kg`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
