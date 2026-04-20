"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavTabs from "@/components/NavTabs";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import type { WarehouseAddress } from "@/lib/types";

interface AddressResponse {
  student: { id: string; member_id: string; name: string };
  warehouse: WarehouseAddress | null;
}

export default function ShippingAddressPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<AddressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Auth-gate case — non-urgent transition keeps the spinner→empty
      // flip from tripping the react-hooks/set-state-in-effect rule.
      startTransition(() => setLoading(false));
      return;
    }
    (async () => {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });
      const res = await fetch("/api/shipping/address", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "加载失败");
        setLoading(false);
        return;
      }
      setData((await res.json()) as AddressResponse);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("复制失败 — 请长按选中手动复制");
    }
  };

  const recipient =
    data && data.warehouse
      ? data.warehouse.recipient_template
          .replace("{member_id}", data.student.member_id)
          .replace("{name}", data.student.name || "")
          .trim()
      : null;

  const fullAddress = data?.warehouse
    ? `${data.warehouse.province}${data.warehouse.city}${data.warehouse.street}`
    : null;

  return (
    <main className="min-h-screen" style={{ background: "var(--cream)" }}>
      <NavTabs />

      {/* Header */}
      <section
        className="relative overflow-hidden border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--gold)" }}
      >
        <div className="max-w-4xl mx-auto px-6 py-12 relative">
          <Link
            href="/shipping"
            className="font-display text-xs tracking-[0.2em] mb-4 inline-block"
            style={{ color: "var(--black)" }}
          >
            ← BACK TO PARCELS
          </Link>
          <h1
            className="font-display text-[48px] sm:text-[72px] leading-[0.85] mb-4"
            style={{ color: "var(--black)" }}
          >
            WAREHOUSE
            <br />
            ADDRESS
          </h1>
          <p className="text-sm max-w-md" style={{ color: "var(--black)" }}>
            把这个地址贴到 Taobao / JD 的收货地址里 —
            收件人必须写你的 <strong>MEMBER ID</strong>，否则仓库无法识别。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {authLoading || loading ? (
          <p
            className="font-display text-xl text-center py-12 tracking-[0.2em]"
            style={{ color: "var(--mid)" }}
          >
            LOADING...
          </p>
        ) : !user ? (
          <div
            className="brutal-card p-8 text-center"
            style={{ background: "var(--cream)" }}
          >
            <h2
              className="font-display text-2xl mb-3"
              style={{ color: "var(--black)" }}
            >
              登录后领取仓库地址
            </h2>
            <p className="text-xs mb-5" style={{ color: "var(--mid)" }}>
              仅限 USC 邮箱登录
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="brutal-btn brutal-btn-primary"
            >
              SIGN IN
            </button>
          </div>
        ) : error ? (
          <div
            className="brutal-card p-5"
            style={{ background: "var(--cardinal)", color: "white" }}
          >
            <p className="font-display text-sm tracking-wider">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Member ID */}
            <section
              className="brutal-container p-6"
              style={{ background: "var(--cream)" }}
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2
                    className="font-display text-xs tracking-[0.2em] mb-2"
                    style={{ color: "var(--mid)" }}
                  >
                    YOUR MEMBER ID
                  </h2>
                  <p
                    className="font-display text-[48px] sm:text-[60px] leading-none"
                    style={{
                      color: "var(--cardinal)",
                      fontFamily: "var(--font-mono, ui-monospace)",
                    }}
                  >
                    {data.student.member_id}
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--mid)" }}>
                    这是你的身份号，在收件人中必须出现。一人一号，不会变。
                  </p>
                </div>
                <button
                  onClick={() => copy("member_id", data.student.member_id)}
                  className="brutal-btn brutal-btn-gold text-sm"
                >
                  {copied === "member_id" ? "✓ 已复制" : "复制"}
                </button>
              </div>
            </section>

            {/* Warehouse address */}
            {data.warehouse ? (
              <section
                className="brutal-container p-6"
                style={{ background: "var(--beige)" }}
              >
                <h2
                  className="font-display text-xs tracking-[0.2em] mb-4"
                  style={{ color: "var(--mid)" }}
                >
                  仓库地址 · {data.warehouse.display_name}
                </h2>

                <div className="space-y-4">
                  <AddressRow
                    label="收件人 · RECIPIENT"
                    value={recipient ?? ""}
                    copyLabel="recipient"
                    copied={copied}
                    onCopy={copy}
                  />
                  <AddressRow
                    label="联系电话 · PHONE"
                    value={data.warehouse.phone}
                    copyLabel="phone"
                    copied={copied}
                    onCopy={copy}
                  />
                  <AddressRow
                    label="地址 · ADDRESS"
                    value={fullAddress ?? ""}
                    copyLabel="address"
                    copied={copied}
                    onCopy={copy}
                  />
                  <AddressRow
                    label="邮编 · POSTAL CODE"
                    value={data.warehouse.postal_code}
                    copyLabel="postal"
                    copied={copied}
                    onCopy={copy}
                  />
                </div>

                {data.warehouse.notes && (
                  <p
                    className="mt-5 p-3 text-xs border-[2px]"
                    style={{
                      borderColor: "var(--black)",
                      background: "var(--cream)",
                      color: "var(--black)",
                    }}
                  >
                    ⚠ {data.warehouse.notes}
                  </p>
                )}
              </section>
            ) : (
              <section
                className="brutal-container p-6"
                style={{ background: "var(--beige)" }}
              >
                <h2
                  className="font-display text-lg mb-2"
                  style={{ color: "var(--black)" }}
                >
                  仓库地址暂未配置
                </h2>
                <p className="text-xs" style={{ color: "var(--mid)" }}>
                  BIA 运营还没开通国内仓库。先把 member ID 记下，开通后第一时间
                  通知你。
                </p>
              </section>
            )}

            {/* How-to */}
            <section
              className="brutal-container p-6"
              style={{ background: "var(--cream)" }}
            >
              <h2
                className="font-display text-lg tracking-[0.15em] mb-3"
                style={{ color: "var(--black)" }}
              >
                怎么用
              </h2>
              <ol
                className="text-sm space-y-2 list-decimal pl-5"
                style={{ color: "var(--black)" }}
              >
                <li>Taobao / JD / 拼多多下单，收货地址选「新增」</li>
                <li>
                  <strong>收件人</strong> 填上面那行（含你的 member ID）
                </li>
                <li>地址 / 电话 / 邮编全部复制过去</li>
                <li>下单成功后回来「预报包裹」— 填国内单号仓库更好对应</li>
                <li>签收 / 发货 / 到美国，每一步 BIA 都会通知你</li>
              </ol>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/shipping/declare"
                  className="brutal-btn brutal-btn-primary inline-block"
                >
                  去预报包裹 →
                </Link>
                <Link
                  href="/shipping"
                  className="brutal-btn inline-block"
                  style={{ background: "var(--cream)", color: "var(--black)" }}
                >
                  我的包裹
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => {
          setShowAuth(false);
          router.refresh();
        }}
      />
    </main>
  );
}

function AddressRow({
  label,
  value,
  copyLabel,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase tracking-wider mb-1"
          style={{ color: "var(--mid)" }}
        >
          {label}
        </p>
        <p
          className="text-base break-all"
          style={{ color: "var(--black)", fontWeight: 500 }}
        >
          {value || "—"}
        </p>
      </div>
      {value && (
        <button
          onClick={() => onCopy(copyLabel, value)}
          className="brutal-btn brutal-btn-gold text-xs whitespace-nowrap"
        >
          {copied === copyLabel ? "✓" : "复制"}
        </button>
      )}
    </div>
  );
}
