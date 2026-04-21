"use client";

// Admin parcels list. Filter by status/search; click row to edit.

import { useEffect, useState } from "react";
import Link from "next/link";
import ParcelStatusPill from "@/components/ParcelStatusPill";
import {
  PARCEL_STATUS_META,
  SHIPPING_METHOD_META,
  PARCEL_STATUS_VALUES,
  type Parcel,
  type ParcelStatus,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function AdminParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ParcelStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (search.trim()) qs.set("search", search.trim());
      qs.set("limit", String(pageSize));
      qs.set("offset", String(page * pageSize));
      const res = await fetch(
        `/api/admin/shipping/parcels?${qs.toString()}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (res.ok) {
        const data = (await res.json()) as { parcels: Parcel[]; total: number };
        setParcels(data.parcels);
        setTotal(data.total);
      }
      setLoading(false);
    })();
    return () => controller.abort();
  }, [status, search, page]);

  return (
    <>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 border-b-[3px] border-[var(--black)] pb-2">
        <h1
          className="font-display text-[32px]"
          style={{ color: "var(--black)" }}
        >
          PARCELS
        </h1>
        <p className="text-xs" style={{ color: "var(--mid)" }}>
          {total} 个包裹
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ParcelStatus | "");
            setPage(0);
          }}
          className="brutal-input sm:w-48"
        >
          <option value="">全部状态</option>
          {PARCEL_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {PARCEL_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="搜 member_id / 描述 / 运单号"
          className="brutal-input flex-1"
        />
      </div>

      {loading ? (
        <p
          className="font-display text-sm tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      ) : parcels.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--mid)" }}>
          没有符合条件的包裹
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr
                className="font-display text-[10px] tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                <th className="text-left py-2 pr-3">MEMBER</th>
                <th className="text-left py-2 pr-3">DESCRIPTION</th>
                <th className="text-left py-2 pr-3">STATUS</th>
                <th className="text-left py-2 pr-3">方式</th>
                <th className="text-left py-2 pr-3">重量</th>
                <th className="text-left py-2 pr-3">CREATED</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => (
                <tr
                  key={p.id}
                  className="border-t-[2px] border-[var(--beige)] hover:bg-[var(--beige)]"
                >
                  <td className="py-3 pr-3">
                    <Link
                      href={`/admin/shipping/parcels/${p.id}`}
                      className="font-display text-xs tracking-wider underline"
                      style={{ color: "var(--black)" }}
                    >
                      {p.member_id}
                    </Link>
                  </td>
                  <td
                    className="py-3 pr-3 max-w-[260px] truncate"
                    style={{ color: "var(--black)" }}
                  >
                    {p.description}
                  </td>
                  <td className="py-3 pr-3">
                    <ParcelStatusPill status={p.status} size="sm" />
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {p.shipping_method
                      ? `${SHIPPING_METHOD_META[p.shipping_method].icon} ${SHIPPING_METHOD_META[p.shipping_method].label}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-xs" style={{ color: "var(--mid)" }}>
                    {p.weight_grams
                      ? `${(p.weight_grams / 1000).toFixed(1)} kg`
                      : "—"}
                  </td>
                  <td
                    className="py-3 pr-3 text-xs"
                    style={{ color: "var(--mid)" }}
                  >
                    {relativeTime(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="brutal-btn"
            style={
              page === 0
                ? { background: "var(--cream)", color: "var(--mid)" }
                : { background: "var(--cardinal)", color: "white" }
            }
          >
            ← PREV
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * pageSize >= total}
            className="brutal-btn"
            style={
              (page + 1) * pageSize >= total
                ? { background: "var(--cream)", color: "var(--mid)" }
                : { background: "var(--cardinal)", color: "white" }
            }
          >
            NEXT →
          </button>
          <span
            className="font-display text-xs tracking-wider self-center ml-2"
            style={{ color: "var(--mid)" }}
          >
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} / {total}
          </span>
        </div>
      )}
    </>
  );
}
