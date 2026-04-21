"use client";

// Compact shipping summary for /account — status counts + open pack requests
// + latest 3 parcels. Full management lives at /shipping.

import Link from "next/link";
import ParcelCard from "@/components/ParcelCard";
import {
  PACK_REQUEST_STATUS_LABELS,
  type Parcel,
  type ParcelStatus,
  type PackRequestWithParcels,
} from "@/lib/types";

interface Props {
  parcels: Parcel[];
  packRequests: PackRequestWithParcels[];
}

// Mirror the 4-tab grouping from /shipping
const BUCKETS: {
  key: string;
  label: string;
  test: (s: ParcelStatus) => boolean;
}[] = [
  {
    key: "active",
    label: "进行中",
    test: (s) =>
      s === "expected" ||
      s === "received_cn" ||
      s === "in_transit" ||
      s === "arrived_us",
  },
  {
    key: "delivered",
    label: "已完成",
    test: (s) => s === "picked_up",
  },
  {
    key: "issues",
    label: "问题件",
    test: (s) => s === "lost" || s === "returned" || s === "disputed",
  },
];

const PACK_OPEN = new Set(["pending", "contacted", "approved"]);

export default function ShippingSummary({ parcels, packRequests }: Props) {
  const counts = BUCKETS.map((b) => ({
    ...b,
    count: parcels.filter((p) => b.test(p.status)).length,
  }));

  const activePackRequests = packRequests.filter((r) =>
    PACK_OPEN.has(r.status),
  );

  const packRequestedIds = new Set<string>();
  for (const r of activePackRequests) {
    for (const p of r.parcels ?? []) packRequestedIds.add(p.id);
  }

  // Most recent 3 parcels
  const recent = [...parcels]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 3);

  if (parcels.length === 0 && activePackRequests.length === 0) {
    return (
      <div
        className="border-[3px] border-[var(--black)] p-5"
        style={{ background: "var(--cream)" }}
      >
        <p className="text-sm mb-3" style={{ color: "var(--mid)" }}>
          还没有预报过包裹 — 拿到 member ID 和仓库地址就可以开始集运。
        </p>
        <Link
          href="/shipping"
          className="font-display text-[11px] tracking-wider px-3 py-1.5 border-[3px] border-[var(--black)] inline-block transition-colors"
          style={{ background: "var(--cardinal)", color: "white" }}
        >
          去集运主页 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {counts.map((b) => (
          <div
            key={b.key}
            className="border-[3px] border-[var(--black)] p-3 text-center"
            style={{ background: "var(--beige)" }}
          >
            <p
              className="font-display text-3xl leading-none"
              style={{ color: "var(--black)" }}
            >
              {b.count}
            </p>
            <p
              className="font-display text-[10px] tracking-wider mt-1 uppercase"
              style={{ color: "var(--mid)" }}
            >
              {b.label}
            </p>
          </div>
        ))}
      </div>

      {/* Active pack requests banner */}
      {activePackRequests.length > 0 && (
        <div
          className="border-[3px] border-[var(--black)] p-3"
          style={{ background: "var(--gold)" }}
        >
          <p
            className="font-display text-xs tracking-wider mb-1"
            style={{ color: "var(--black)" }}
          >
            打包申请进行中
          </p>
          <div
            className="flex flex-wrap gap-2 text-[11px]"
            style={{ color: "var(--black)" }}
          >
            {activePackRequests.map((r) => (
              <span
                key={r.id}
                className="font-display px-2 py-0.5 border-[2px] border-[var(--black)]"
                style={{ background: "var(--cream)" }}
              >
                {PACK_REQUEST_STATUS_LABELS[r.status]} ·{" "}
                {r.parcels?.length ?? 0} 件
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent parcels */}
      {recent.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recent.map((p) => (
            <ParcelCard
              key={p.id}
              parcel={p}
              packRequested={packRequestedIds.has(p.id)}
            />
          ))}
        </div>
      )}

      {/* Footer link to full page */}
      <div className="flex justify-end">
        <Link
          href="/shipping"
          className="font-display text-[11px] tracking-wider px-3 py-1.5 border-[3px] border-[var(--black)] transition-colors hover:bg-[var(--gold)]"
          style={{ background: "var(--cream)", color: "var(--black)" }}
        >
          查看全部 →
        </Link>
      </div>
    </div>
  );
}
