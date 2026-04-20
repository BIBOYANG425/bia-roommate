"use client";

// Admin dashboard home — quick counts + links to each section.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ADMIN_SECTIONS, ADMIN_GROUPS } from "@/lib/admin/sections";
import { PARCEL_STATUS_META, type ParcelStatus } from "@/lib/types";

interface Counts {
  parcelsByStatus: Record<ParcelStatus, number>;
  parcelsTotal: number;
  activeShipments: number;
  totalShipments: number;
  usersTotal: number;
}

export default function AdminHomePage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        // Stats endpoint isn't built until later phases; keep the page
        // usable regardless.
        if (res.status !== 404) setError("加载统计失败");
        return;
      }
      setCounts((await res.json()) as Counts);
    })();
  }, []);

  const groups: Record<string, typeof ADMIN_SECTIONS> = {};
  for (const s of ADMIN_SECTIONS) {
    (groups[s.group] ??= []).push(s);
  }

  return (
    <>
      <h1
        className="font-display text-[40px] sm:text-[56px] mb-2 leading-[0.9]"
        style={{ color: "var(--black)" }}
      >
        DASHBOARD
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--mid)" }}>
        BIA Services · 运营面板
      </p>

      {counts && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <CountCard
            title="包裹总数"
            value={counts.parcelsTotal}
            hint={`${counts.parcelsByStatus.expected ?? 0} expected · ${counts.parcelsByStatus.in_transit ?? 0} in-transit`}
          />
          <CountCard
            title="进行中批次"
            value={counts.activeShipments}
            hint={`共 ${counts.totalShipments} 批`}
          />
          <CountCard title="注册用户" value={counts.usersTotal} />
        </section>
      )}

      {error && (
        <p className="text-xs mb-6" style={{ color: "var(--cardinal)" }}>
          {error}
        </p>
      )}

      {counts && (
        <section className="mb-10">
          <h2
            className="font-display text-lg tracking-[0.15em] mb-3"
            style={{ color: "var(--black)" }}
          >
            PARCELS BY STATUS
          </h2>
          <div
            className="brutal-container p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
            style={{ background: "var(--beige)" }}
          >
            {(Object.keys(PARCEL_STATUS_META) as ParcelStatus[]).map((s) => {
              const n = counts.parcelsByStatus[s] ?? 0;
              if (n === 0) return null;
              return (
                <div key={s}>
                  <p
                    className="font-display text-[10px] tracking-wider"
                    style={{ color: "var(--mid)" }}
                  >
                    {PARCEL_STATUS_META[s].label}
                  </p>
                  <p
                    className="font-display text-2xl"
                    style={{ color: "var(--black)" }}
                  >
                    {n}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2
          className="font-display text-lg tracking-[0.15em] mb-3"
          style={{ color: "var(--black)" }}
        >
          SECTIONS
        </h2>
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-6">
            <p
              className="font-display text-[10px] tracking-[0.2em] mb-2"
              style={{ color: "var(--mid)" }}
            >
              {ADMIN_GROUPS[group as keyof typeof ADMIN_GROUPS]}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="brutal-container p-4 hover:-translate-y-0.5 transition-transform"
                  style={{ background: "var(--cream)" }}
                >
                  <p
                    className="font-display text-lg tracking-[0.1em]"
                    style={{ color: "var(--black)" }}
                  >
                    <span className="mr-2">{s.icon}</span>
                    {s.label}
                  </p>
                  {s.hint && (
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "var(--mid)" }}
                    >
                      {s.hint}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function CountCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number;
  hint?: string;
}) {
  return (
    <div
      className="brutal-container p-4"
      style={{ background: "var(--cream)" }}
    >
      <p
        className="font-display text-[10px] tracking-wider"
        style={{ color: "var(--mid)" }}
      >
        {title}
      </p>
      <p
        className="font-display text-3xl mt-1"
        style={{ color: "var(--black)" }}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] mt-1" style={{ color: "var(--mid)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
