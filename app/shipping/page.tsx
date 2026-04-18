"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import NavTabs from "@/components/NavTabs";
import Toast from "@/components/Toast";
import SkeletonCard from "@/components/SkeletonCard";
import ParcelCard from "@/components/ParcelCard";
import {
  PARCEL_STATUS_META,
  type Parcel,
  type ParcelStatus,
} from "@/lib/types";

type TabKey = "active" | "delivered" | "issues" | "all";

const TAB_FILTERS: Record<TabKey, (s: ParcelStatus) => boolean> = {
  active: (s) =>
    s === "expected" ||
    s === "received_cn" ||
    s === "in_transit" ||
    s === "arrived_us",
  delivered: (s) => s === "picked_up",
  issues: (s) => s === "lost" || s === "returned" || s === "disputed",
  all: () => true,
};

const TAB_LABELS: Record<TabKey, string> = {
  active: "进行中",
  delivered: "已完成",
  issues: "问题件",
  all: "全部",
};

function ShippingDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) || "active",
  );
  const [showAuth, setShowAuth] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("declared") === "true") {
      setToastMsg("包裹已预报成功 — 发货后记得填跟踪号");
      setShowToast(true);
      router.replace("/shipping", { scroll: false });
    } else if (searchParams.get("updated") === "true") {
      setToastMsg("已更新");
      setShowToast(true);
      router.replace("/shipping", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/shipping/parcels", {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("加载失败 — 请重试");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Parcel[];
      setParcels(data);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const filtered = parcels.filter((p) => TAB_FILTERS[tab](p.status));

  // Stats for hero counters
  const counts = {
    active: parcels.filter((p) => TAB_FILTERS.active(p.status)).length,
    delivered: parcels.filter((p) => TAB_FILTERS.delivered(p.status)).length,
    issues: parcels.filter((p) => TAB_FILTERS.issues(p.status)).length,
  };

  // Hero "next action" — promote the most actionable tile based on state
  const nextAction = (() => {
    if (!user) return null;
    const arrived = parcels.find((p) => p.status === "arrived_us");
    if (arrived) {
      return {
        headline: "有包裹在美国等你取",
        body: "BIA 会通过微信通知取件时间和地点。",
        href: `/shipping/${arrived.id}`,
        cta: "查看详情 →",
      };
    }
    const inTransit = parcels.find((p) => p.status === "in_transit");
    if (inTransit) {
      return {
        headline: "国际段运输中",
        body: "一般 7-14 天到 USC，到了 George 会发通知。",
        href: `/shipping/${inTransit.id}`,
        cta: "看进度 →",
      };
    }
    const received = parcels.find((p) => p.status === "received_cn");
    if (received) {
      return {
        headline: "仓库已签收",
        body: "等下一批国际段发货，耐心等一等。",
        href: `/shipping/${received.id}`,
        cta: "看详情 →",
      };
    }
    const expected = parcels.find(
      (p) => p.status === "expected" && !p.tracking_cn,
    );
    if (expected) {
      return {
        headline: "有预报但还没填跟踪号",
        body: "Taobao 发货后填跟踪号，仓库可以提前核对。",
        href: `/shipping/${expected.id}`,
        cta: "去填 →",
      };
    }
    return null;
  })();

  return (
    <main className="min-h-screen" style={{ background: "var(--cream)" }}>
      {showToast && (
        <Toast message={toastMsg} onClose={() => setShowToast(false)} />
      )}

      <NavTabs />

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--cream)" }}
      >
        <div className="ghost-text -left-4 top-1/2 -translate-y-1/2">
          集运
        </div>
        <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20 relative">
          <div className="new-drop-badge mb-3">SHIPPING · 集运</div>
          <h1
            className="font-display text-[56px] sm:text-[88px] leading-[0.85] mb-4"
            style={{ color: "var(--black)" }}
          >
            BIA
            <br />
            <span className="glitch-text" style={{ color: "var(--cardinal)" }}>
              集运直达
            </span>
          </h1>
          <p
            className="text-sm sm:text-base max-w-md mb-8"
            style={{ color: "var(--mid)" }}
          >
            淘宝下单 → 国内仓库代收 → 拼箱发美国 → USC 取件。
            <br />
            小包裹也收，BIA 兜底。
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/shipping/declare"
              className="brutal-btn brutal-btn-primary inline-block"
            >
              预报包裹 →
            </Link>
            <Link
              href="/shipping/address"
              className="brutal-btn brutal-btn-gold inline-block"
            >
              仓库地址 / 我的 MEMBER ID
            </Link>
          </div>
        </div>
      </section>

      {/* Next-action card */}
      {nextAction && (
        <section className="max-w-6xl mx-auto px-6 pt-8">
          <Link
            href={nextAction.href}
            className="brutal-card block p-5 sm:p-6 hover:-translate-y-0.5 transition-transform"
            style={{ background: "var(--gold)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="font-display text-2xl sm:text-3xl mb-1"
                  style={{ color: "var(--black)" }}
                >
                  {nextAction.headline}
                </h2>
                <p className="text-sm" style={{ color: "var(--black)" }}>
                  {nextAction.body}
                </p>
              </div>
              <span
                className="font-display text-sm tracking-wider whitespace-nowrap"
                style={{ color: "var(--cardinal)" }}
              >
                {nextAction.cta}
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Parcel list */}
      <section className="max-w-6xl mx-auto px-6 py-8 relative">
        <span className="section-number">01</span>
        <h2
          className="font-display text-[40px] sm:text-[60px] mb-6"
          style={{ color: "var(--black)" }}
        >
          MY PARCELS
        </h2>

        {!authLoading && !user && (
          <div
            className="brutal-card p-6 text-center"
            style={{ background: "var(--beige)" }}
          >
            <p
              className="font-display text-xl mb-3"
              style={{ color: "var(--black)" }}
            >
              登录后查看你的包裹
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--mid)" }}>
              仅限 USC 邮箱登录。
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="brutal-btn brutal-btn-primary"
            >
              SIGN IN
            </button>
          </div>
        )}

        {user && (
          <>
            {/* Tabs */}
            <div className="flex gap-0 mb-6 flex-wrap">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
                const active = tab === key;
                const count =
                  key === "all"
                    ? parcels.length
                    : counts[key as "active" | "delivered" | "issues"];
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className="font-display text-sm sm:text-base tracking-[0.1em] px-5 sm:px-7 py-3 border-[3px] border-[var(--black)] -mr-[3px] first:mr-0 transition-colors"
                    style={{
                      background: active ? "var(--cardinal)" : "var(--cream)",
                      color: active ? "white" : "var(--mid)",
                    }}
                  >
                    {TAB_LABELS[key]}
                    {count > 0 && (
                      <span className="ml-2 text-[11px] opacity-80">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p
                  className="font-display text-2xl"
                  style={{ color: "var(--cardinal)" }}
                >
                  {error}
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 relative">
                <div className="ghost-text left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px]">
                  EMPTY
                </div>
                <h3
                  className="font-display text-3xl mb-3 relative"
                  style={{ color: "var(--black)" }}
                >
                  {parcels.length === 0
                    ? "还没有预报过包裹"
                    : `${TAB_LABELS[tab]} 暂无`}
                </h3>
                <p
                  className="text-sm mb-6 relative"
                  style={{ color: "var(--mid)" }}
                >
                  {parcels.length === 0
                    ? "先拿到你的 member ID 和仓库地址，然后就可以预报。"
                    : "切到「全部」看所有包裹"}
                </p>
                {parcels.length === 0 && (
                  <Link
                    href="/shipping/address"
                    className="brutal-btn brutal-btn-primary inline-block relative"
                  >
                    拿仓库地址 →
                  </Link>
                )}
              </div>
            ) : (
              <>
                <p
                  className="text-xs mb-4"
                  style={{
                    color: "var(--mid)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {filtered.length} 个包裹
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((p, i) => (
                    <div
                      key={p.id}
                      className="reveal"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <ParcelCard parcel={p} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Status legend */}
        {user && parcels.length > 0 && (
          <div
            className="mt-12 p-5 border-[3px] border-[var(--black)]"
            style={{ background: "var(--beige)" }}
          >
            <h4
              className="font-display text-sm tracking-[0.15em] mb-3"
              style={{ color: "var(--black)" }}
            >
              状态说明
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {(Object.keys(PARCEL_STATUS_META) as ParcelStatus[]).map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <span
                    className="font-display text-[10px] tracking-wider whitespace-nowrap"
                    style={{ color: "var(--cardinal)" }}
                  >
                    {PARCEL_STATUS_META[k].label}
                  </span>
                  <span style={{ color: "var(--mid)" }}>
                    {PARCEL_STATUS_META[k].hint}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}

export default function ShippingDashboardPage() {
  return (
    <Suspense>
      <ShippingDashboardContent />
    </Suspense>
  );
}
