"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import ParcelStatusPill from "@/components/ParcelStatusPill";
import {
  PARCEL_STATUS_META,
  type Parcel,
  type ParcelEvent,
  type Shipment,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [events, setEvents] = useState<ParcelEvent[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/shipping");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/shipping/parcels/${id}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(res.status === 404 ? "包裹不存在或无权访问" : "加载失败");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        parcel: Parcel;
        events: ParcelEvent[];
        shipment: Shipment | null;
      };
      if (cancelled) return;
      setParcel(data.parcel);
      setEvents(data.events);
      setShipment(data.shipment);

      // Generate signed URLs for the photo paths (private bucket).
      const paths = data.parcel.photos ?? [];
      if (paths.length === 0) {
        setPhotoUrls([]);
      } else {
        const { data: signed } = await supabase.storage
          .from("parcel-photos")
          .createSignedUrls(paths, 60 * 60); // 1h TTL
        if (!cancelled) {
          setPhotoUrls(
            (signed ?? [])
              .map((s: { signedUrl: string | null }) => s?.signedUrl ?? "")
              .filter((u: string) => u.length > 0),
          );
        }
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, router]);

  const handleDelete = async () => {
    if (!parcel || parcel.status !== "expected") return;
    if (!confirm("删除这条预报？此操作不可撤销。")) return;
    setDeleting(true);
    const res = await fetch(`/api/shipping/parcels/${parcel.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("删除失败");
      setDeleting(false);
      return;
    }
    router.replace("/shipping?tab=all");
  };

  if (loading || authLoading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--cream)" }}
      >
        <p
          className="font-display text-2xl tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      </main>
    );
  }

  if (error || !parcel) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--cream)" }}
      >
        <p
          className="font-display text-3xl"
          style={{ color: "var(--cardinal)" }}
        >
          {error ?? "未找到"}
        </p>
        <Link
          href="/shipping"
          className="brutal-btn brutal-btn-primary inline-block"
        >
          ← BACK TO PARCELS
        </Link>
      </main>
    );
  }

  const canEdit = parcel.status === "expected";
  const weightKg = parcel.weight_grams
    ? (parcel.weight_grams / 1000).toFixed(1)
    : null;

  return (
    <main className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <Link
            href="/shipping"
            className="font-display text-xs tracking-[0.2em] text-white/60 hover:text-white mb-4 inline-block"
          >
            ← BACK
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span
                className="font-display text-[11px] tracking-[0.2em] inline-block px-2 py-0.5 border-[2px] border-white mb-3"
                style={{ background: "var(--gold)", color: "var(--black)" }}
              >
                {parcel.member_id}
              </span>
              <h1 className="font-display text-[32px] sm:text-[48px] text-white leading-[0.9] max-w-xl">
                {parcel.description}
              </h1>
            </div>
            <ParcelStatusPill status={parcel.status} />
          </div>
          <p className="text-xs text-white/60 mt-4">
            {PARCEL_STATUS_META[parcel.status].hint}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Photos */}
        {photoUrls.length > 0 && (
          <section
            className="brutal-container p-5"
            style={{ background: "var(--beige)" }}
          >
            <h2
              className="font-display text-lg tracking-[0.15em] mb-3"
              style={{ color: "var(--black)" }}
            >
              PHOTOS
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {photoUrls.map((url, idx) => (
                <Image
                  key={idx}
                  src={url}
                  alt={`Parcel photo ${idx + 1}`}
                  width={300}
                  height={200}
                  unoptimized
                  className="w-full h-32 object-cover border-[3px] border-[var(--black)]"
                />
              ))}
            </div>
          </section>
        )}

        {/* Facts grid */}
        <section
          className="brutal-container p-5"
          style={{ background: "var(--cream)" }}
        >
          <h2
            className="font-display text-lg tracking-[0.15em] mb-3"
            style={{ color: "var(--black)" }}
          >
            DETAILS
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-sm">
            {parcel.category && (
              <Fact label="分类" value={parcel.category} />
            )}
            {parcel.carrier_cn && (
              <Fact label="国内快递" value={parcel.carrier_cn} />
            )}
            {parcel.tracking_cn && (
              <Fact label="国内单号" value={parcel.tracking_cn} mono />
            )}
            {parcel.declared_value_cny !== null && (
              <Fact label="申报金额" value={`¥${parcel.declared_value_cny}`} />
            )}
            {weightKg && <Fact label="重量" value={`${weightKg} kg`} />}
            {parcel.received_at && (
              <Fact
                label="签收时间"
                value={new Date(parcel.received_at).toLocaleString("zh-CN")}
              />
            )}
            {parcel.user_notes && (
              <div className="sm:col-span-2">
                <dt
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  我的备注
                </dt>
                <dd style={{ color: "var(--black)" }}>{parcel.user_notes}</dd>
              </div>
            )}
            {parcel.notes && (
              <div className="sm:col-span-2">
                <dt
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  仓库备注
                </dt>
                <dd style={{ color: "var(--black)" }}>{parcel.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Shipment card (if batched) */}
        {shipment && (
          <section
            className="brutal-container p-5"
            style={{ background: "var(--gold)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <h2
                className="font-display text-lg tracking-[0.15em]"
                style={{ color: "var(--black)" }}
              >
                {shipment.name}
              </h2>
              <span
                className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)]"
                style={{ background: "var(--cream)", color: "var(--black)" }}
              >
                {shipment.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-sm">
              {shipment.carrier && (
                <Fact label="承运" value={shipment.carrier} />
              )}
              {shipment.international_tracking && (
                <Fact
                  label="国际单号"
                  value={shipment.international_tracking}
                  mono
                />
              )}
              {shipment.departed_cn_at && (
                <Fact
                  label="发出日"
                  value={new Date(shipment.departed_cn_at).toLocaleDateString(
                    "zh-CN",
                  )}
                />
              )}
              {shipment.arrived_us_at && (
                <Fact
                  label="到达日"
                  value={new Date(shipment.arrived_us_at).toLocaleDateString(
                    "zh-CN",
                  )}
                />
              )}
              {shipment.pickup_location && (
                <Fact label="取件地点" value={shipment.pickup_location} />
              )}
              {shipment.pickup_starts_at && shipment.pickup_ends_at && (
                <Fact
                  label="取件时间"
                  value={`${new Date(shipment.pickup_starts_at).toLocaleString("zh-CN")} — ${new Date(shipment.pickup_ends_at).toLocaleTimeString("zh-CN")}`}
                />
              )}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section
          className="brutal-container p-5"
          style={{ background: "var(--cream)" }}
        >
          <h2
            className="font-display text-lg tracking-[0.15em] mb-4"
            style={{ color: "var(--black)" }}
          >
            TIMELINE
          </h2>
          {events.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--mid)" }}>
              暂无状态变化记录
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

        {/* Actions */}
        <section className="flex flex-wrap gap-3">
          {canEdit && (
            <>
              <Link
                href={`/shipping/declare?edit=${parcel.id}`}
                className="brutal-btn brutal-btn-primary"
              >
                编辑
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="brutal-btn"
                style={{
                  background: "var(--beige)",
                  color: "var(--cardinal)",
                }}
              >
                {deleting ? "删除中..." : "删除"}
              </button>
            </>
          )}
          <Link href="/shipping" className="brutal-btn brutal-btn-gold">
            返回列表
          </Link>
        </section>
      </div>
    </main>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt
        className="text-[10px] uppercase tracking-wider mb-0.5"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </dt>
      <dd
        style={{
          color: "var(--black)",
          fontFamily: mono ? "var(--font-mono, ui-monospace)" : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
