"use client";

// Admin list of shipment_requests — status + admin_note editor.

import { useEffect, useState } from "react";
import Field from "@/components/admin/Field";
import {
  SHIPMENT_REQUEST_STATUS_VALUES,
  SHIPMENT_REQUEST_STATUS_LABELS,
  SHIPPING_METHOD_META,
  type ShipmentRequest,
  type ShipmentRequestStatus,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

type Draft = {
  status?: ShipmentRequestStatus;
  admin_note?: string | null;
};

const STATUS_TONES: Record<ShipmentRequestStatus, string> = {
  pending: "var(--gold)",
  contacted: "var(--beige)",
  scheduled: "#1c6f3d",
  declined: "var(--cardinal)",
  completed: "#4c4a46",
};
const STATUS_TEXT_COLORS: Record<ShipmentRequestStatus, string> = {
  pending: "var(--black)",
  contacted: "var(--black)",
  scheduled: "white",
  declined: "white",
  completed: "white",
};

export default function AdminShipmentRequestsPage() {
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShipmentRequestStatus | "">("");

  const load = async () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/admin/shipping/requests${qs}`, {
      cache: "no-store",
    });
    if (res.ok) setRequests((await res.json()) as ShipmentRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateDraft = (id: string, patch: Draft) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const res = await fetch(`/api/admin/shipping/requests/${id}`, {
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
    const updated = (await res.json()) as ShipmentRequest;
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setToast("已保存");
    setTimeout(() => setToast(null), 1500);
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
          REQUESTS
        </h1>
        <p className="text-xs" style={{ color: "var(--mid)" }}>
          {requests.length} 个申请
        </p>
      </div>

      <div className="mb-5">
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as ShipmentRequestStatus | "")
          }
          className="brutal-input"
          style={{ width: "12rem" }}
        >
          <option value="">全部状态</option>
          {SHIPMENT_REQUEST_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_REQUEST_STATUS_LABELS[s]}
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
          暂无申请
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const draft = drafts[r.id] ?? {};
            const currentStatus = draft.status ?? r.status;
            const dirty =
              draft.status !== undefined ||
              (draft.admin_note !== undefined &&
                draft.admin_note !== r.admin_note);
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
                      {relativeTime(r.created_at)}
                    </p>
                  </div>
                  <span
                    className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
                    style={{
                      background: STATUS_TONES[r.status],
                      color: STATUS_TEXT_COLORS[r.status],
                    }}
                  >
                    {SHIPMENT_REQUEST_STATUS_LABELS[r.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--mid)" }}
                    >
                      申请内容
                    </p>
                    <p
                      className="whitespace-pre-wrap"
                      style={{ color: "var(--black)" }}
                    >
                      {r.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {r.expected_weight_grams && (
                      <div>
                        <p
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--mid)" }}
                        >
                          预估重量
                        </p>
                        <p style={{ color: "var(--black)" }}>
                          {(r.expected_weight_grams / 1000).toFixed(1)} kg
                        </p>
                      </div>
                    )}
                    {r.urgency_note && (
                      <div>
                        <p
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--mid)" }}
                        >
                          时效
                        </p>
                        <p style={{ color: "var(--black)" }}>
                          {r.urgency_note}
                        </p>
                      </div>
                    )}
                    {r.contact && (
                      <div className="col-span-2">
                        <p
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--mid)" }}
                        >
                          联系方式
                        </p>
                        <p style={{ color: "var(--black)" }}>{r.contact}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Field label="STATUS">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        updateDraft(r.id, {
                          status: e.target.value as ShipmentRequestStatus,
                        })
                      }
                      className="brutal-input"
                    >
                      {SHIPMENT_REQUEST_STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                          {SHIPMENT_REQUEST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ADMIN NOTE">
                    <input
                      type="text"
                      value={draft.admin_note ?? r.admin_note ?? ""}
                      onChange={(e) =>
                        updateDraft(r.id, {
                          admin_note: e.target.value,
                        })
                      }
                      placeholder="运营备注"
                      className="brutal-input"
                    />
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() => save(r.id)}
                  disabled={!dirty || savingId === r.id}
                  className="brutal-btn mt-4"
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
            );
          })}
        </div>
      )}
    </>
  );
}
