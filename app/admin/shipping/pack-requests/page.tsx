"use client";

// Admin view of user-initiated pack requests — the regular flow.

import { useEffect, useState } from "react";
import Link from "next/link";
import Field from "@/components/admin/Field";
import {
  PACK_REQUEST_STATUS_VALUES,
  PACK_REQUEST_STATUS_LABELS,
  SHIPPING_METHOD_META,
  type PackRequestStatus,
  type PackRequestWithParcels,
  type Shipment,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

type Draft = {
  status?: PackRequestStatus;
  admin_note?: string | null;
  shipment_id?: string | null;
};

const STATUS_TONES: Record<PackRequestStatus, string> = {
  pending: "var(--gold)",
  contacted: "var(--beige)",
  approved: "#1c6f3d",
  packed: "#1c6f3d",
  shipped: "#4c4a46",
  declined: "var(--cardinal)",
  cancelled: "var(--beige)",
};
const STATUS_FG: Record<PackRequestStatus, string> = {
  pending: "var(--black)",
  contacted: "var(--black)",
  approved: "white",
  packed: "white",
  shipped: "white",
  declined: "white",
  cancelled: "var(--mid)",
};

// Batches in these statuses are still accepting new parcels. Anything past
// departed_cn is already in the air/sea, can't attach into it.
const OPEN_SHIPMENT_STATUSES = ["forming", "sealed"] as const;

export default function AdminPackRequestsPage() {
  const [requests, setRequests] = useState<PackRequestWithParcels[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pickedShipment, setPickedShipment] = useState<Record<string, string>>(
    {},
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<PackRequestStatus | "">("");

  const load = async () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    const [rRes, sRes] = await Promise.all([
      fetch(`/api/admin/shipping/pack-requests${qs}`, { cache: "no-store" }),
      fetch("/api/admin/shipping/shipments", { cache: "no-store" }),
    ]);
    if (rRes.ok) {
      setRequests((await rRes.json()) as PackRequestWithParcels[]);
    }
    if (sRes.ok) {
      const all = (await sRes.json()) as Shipment[];
      setShipments(
        all.filter((s) =>
          OPEN_SHIPMENT_STATUSES.includes(
            s.status as (typeof OPEN_SHIPMENT_STATUSES)[number],
          ),
        ),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const attachToShipment = async (requestId: string) => {
    const shipmentId = pickedShipment[requestId];
    if (!shipmentId) return;
    setAttachingId(requestId);
    const res = await fetch(
      `/api/admin/shipping/pack-requests/${requestId}/attach`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: shipmentId }),
      },
    );
    setAttachingId(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "附加失败");
      return;
    }
    const data = (await res.json()) as { attached: number };
    setToast(`已附加 ${data.attached} 个包裹 · 申请已标记 approved`);
    setTimeout(() => setToast(null), 2500);
    setPickedShipment((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    await load();
  };

  const updateDraft = (id: string, patch: Draft) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const res = await fetch(`/api/admin/shipping/pack-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSavingId(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToast(err.error ?? "保存失败");
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setToast("已保存");
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
          PACK REQUESTS
        </h1>
        <p className="text-xs" style={{ color: "var(--mid)" }}>
          {requests.length} 个申请 · 常规拼单流程
        </p>
      </div>

      <div className="mb-5">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as PackRequestStatus | "")}
          className="brutal-input"
          style={{ width: "12rem" }}
        >
          <option value="">全部状态</option>
          {PACK_REQUEST_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {PACK_REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p
          className="font-display text-sm tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      ) : requests.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--mid)" }}>
          暂无打包申请
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const draft = drafts[r.id] ?? {};
            const currentStatus = draft.status ?? r.status;
            const dirty =
              draft.status !== undefined ||
              (draft.admin_note !== undefined &&
                draft.admin_note !== r.admin_note) ||
              (draft.shipment_id !== undefined &&
                draft.shipment_id !== r.shipment_id);
            return (
              <div
                key={r.id}
                className="brutal-container p-5"
                style={{ background: "var(--beige)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <p
                      className="font-display text-base tracking-[0.1em]"
                      style={{ color: "var(--black)" }}
                    >
                      {r.member_id ?? "(未绑 member)"}
                      {r.preferred_method && (
                        <span
                          className="text-xs tracking-wider ml-2"
                          style={{ color: "var(--mid)" }}
                        >
                          · {SHIPPING_METHOD_META[r.preferred_method].icon}{" "}
                          {SHIPPING_METHOD_META[r.preferred_method].label}
                        </span>
                      )}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--mid)" }}
                    >
                      {relativeTime(r.created_at)} ·{" "}
                      <strong>{r.parcels?.length ?? 0}</strong> 个包裹
                    </p>
                  </div>
                  <span
                    className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
                    style={{
                      background: STATUS_TONES[r.status],
                      color: STATUS_FG[r.status],
                    }}
                  >
                    {PACK_REQUEST_STATUS_LABELS[r.status]}
                  </span>
                </div>

                {r.parcels && r.parcels.length > 0 && (
                  <div className="mb-3">
                    <p
                      className="text-[10px] uppercase tracking-wider mb-1"
                      style={{ color: "var(--mid)" }}
                    >
                      包含包裹
                    </p>
                    <div className="space-y-1 text-sm">
                      {r.parcels.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-2 border-[2px] border-[var(--black)]"
                          style={{ background: "var(--cream)" }}
                        >
                          <Link
                            href={`/admin/shipping/parcels/${p.id}`}
                            className="font-display text-[10px] tracking-wider underline"
                            style={{ color: "var(--black)" }}
                          >
                            {p.member_id}
                          </Link>
                          <span
                            className="flex-1 min-w-0 truncate"
                            style={{ color: "var(--black)" }}
                          >
                            {p.description}
                          </span>
                          {p.weight_grams && (
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--mid)" }}
                            >
                              {(p.weight_grams / 1000).toFixed(1)} kg
                            </span>
                          )}
                          {p.shipping_method && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--mid)" }}
                            >
                              {SHIPPING_METHOD_META[p.shipping_method].icon}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                  {r.urgency_note && (
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--mid)" }}
                      >
                        时效
                      </p>
                      <p style={{ color: "var(--black)" }}>{r.urgency_note}</p>
                    </div>
                  )}
                  {r.contact && (
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--mid)" }}
                      >
                        联系方式
                      </p>
                      <p style={{ color: "var(--black)" }}>{r.contact}</p>
                    </div>
                  )}
                  {r.user_note && (
                    <div className="sm:col-span-2">
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--mid)" }}
                      >
                        用户备注
                      </p>
                      <p style={{ color: "var(--black)" }}>{r.user_note}</p>
                    </div>
                  )}
                </div>

                {/* Attach-to-batch row (only for pending / contacted — once
                    approved+, the parcels are already in a shipment) */}
                {(r.status === "pending" || r.status === "contacted") &&
                  (shipments.length > 0 ? (
                    <div
                      className="mb-3 p-3 border-[3px] border-[var(--black)]"
                      style={{ background: "var(--gold)" }}
                    >
                      <p
                        className="font-display text-[10px] tracking-wider mb-2"
                        style={{ color: "var(--black)" }}
                      >
                        拍进现有批次（自动把这些包裹关联到批次并推进到 in_transit）
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={pickedShipment[r.id] ?? ""}
                          onChange={(e) =>
                            setPickedShipment((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                          className="brutal-input flex-1 min-w-0"
                          style={{ flex: "1 1 auto" }}
                        >
                          <option value="">选一个批次...</option>
                          {shipments.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} [{s.status}]
                              {s.carrier ? ` · ${s.carrier}` : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => attachToShipment(r.id)}
                          disabled={
                            !pickedShipment[r.id] || attachingId === r.id
                          }
                          className="brutal-btn shrink-0"
                          style={
                            pickedShipment[r.id] && attachingId !== r.id
                              ? {
                                  background: "var(--cardinal)",
                                  color: "white",
                                }
                              : {
                                  background: "var(--cream)",
                                  color: "var(--mid)",
                                  cursor: "not-allowed",
                                }
                          }
                        >
                          {attachingId === r.id ? "处理中..." : "拍进批次"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="mb-3 p-3 border-[3px] border-dashed border-[var(--black)]"
                      style={{ background: "var(--cream)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--mid)" }}>
                        目前没有 forming / sealed 状态的批次。
                      </p>
                      <Link
                        href="/admin/shipping/shipments"
                        className="font-display text-[11px] tracking-wider underline"
                        style={{ color: "var(--cardinal)" }}
                      >
                        先去创建一个批次 →
                      </Link>
                    </div>
                  ))}

                {/* Already attached — show link back to shipment */}
                {r.shipment_id && (
                  <div
                    className="mb-3 p-3 border-[3px] border-[var(--black)]"
                    style={{ background: "var(--cream)" }}
                  >
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--mid)" }}
                    >
                      已关联批次 ·{" "}
                      <Link
                        href={`/admin/shipping/shipments/${r.shipment_id}`}
                        className="underline font-display"
                        style={{ color: "var(--black)" }}
                      >
                        查看批次 →
                      </Link>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Field label="STATUS">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        updateDraft(r.id, {
                          status: e.target.value as PackRequestStatus,
                        })
                      }
                      className="brutal-input"
                    >
                      {PACK_REQUEST_STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                          {PACK_REQUEST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="ADMIN NOTE (用户能看到)">
                      <input
                        type="text"
                        value={draft.admin_note ?? r.admin_note ?? ""}
                        onChange={(e) =>
                          updateDraft(r.id, { admin_note: e.target.value })
                        }
                        placeholder="如：已加进周五的海运批次，周四上午会安排打包"
                        className="brutal-input"
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => save(r.id)}
                    disabled={!dirty || savingId === r.id}
                    className="brutal-btn"
                    style={
                      dirty && savingId !== r.id
                        ? { background: "var(--cardinal)", color: "white" }
                        : {
                            background: "var(--cream)",
                            color: "var(--mid)",
                            cursor: "not-allowed",
                          }
                    }
                  >
                    {savingId === r.id ? "保存中..." : dirty ? "保存" : "未修改"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
