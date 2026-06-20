"use client";

// /shipping/terms — public pricing + policy surface for 集运.
// Honest, data-driven (prices from /api/shipping/routes) and explicit that
// payment is OFFLINE (no online checkout). Covers pricing, payment, liability /
// 理赔, prohibited & sensitive-line items, and warehouse storage basics.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import ProductShell from "@/components/ProductShell";
import {
  SHIPPING_METHOD_META,
  SHIPPING_METHOD_ORDER,
  type ShippingMethod,
  type ShippingRoute,
  type ShippingContact,
} from "@/lib/types";

function TermsContent() {
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
  const [contacts, setContacts] = useState<ShippingContact[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/shipping/routes");
      if (res.ok) {
        const data = (await res.json()) as {
          routes: ShippingRoute[];
          contacts: ShippingContact[];
        };
        setRoutes(data.routes ?? []);
        setContacts(data.contacts ?? []);
      }
    })();
  }, []);

  const sortedRoutes = [...routes].sort(
    (a, b) =>
      SHIPPING_METHOD_ORDER[a.method as ShippingMethod] -
      SHIPPING_METHOD_ORDER[b.method as ShippingMethod],
  );

  const wechatContacts = contacts.filter(
    (c) => c.type === "wechat_group" || c.type === "wechat_personal",
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
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
            PRICING &amp;
            <br />
            POLICY
          </h1>
          <p className="text-sm max-w-md" style={{ color: "var(--black)" }}>
            价格、付款方式、理赔与违禁品说明 — 下单前花两分钟看一眼，省去后面扯皮。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 01 — Pricing */}
        <section
          className="brutal-container p-6"
          style={{ background: "var(--cream)" }}
        >
          <span className="section-number text-[64px]">01</span>
          <h2
            className="font-display text-2xl tracking-[0.1em] mb-2"
            style={{ color: "var(--black)" }}
          >
            价格如何算
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--mid)" }}>
            按<strong>实际重量</strong>计费（¥/kg），多件拼箱更划算。下面是各线路参考价，
            <strong>最终以每批报价为准</strong>。
          </p>

          {sortedRoutes.length > 0 ? (
            <div className="space-y-3">
              {sortedRoutes.map((r) => {
                const meta = SHIPPING_METHOD_META[r.method as ShippingMethod];
                return (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-3 flex-wrap p-3 border-[2px] border-[var(--black)]"
                    style={{ background: "var(--beige)" }}
                  >
                    <div>
                      <p
                        className="font-display text-base"
                        style={{ color: "var(--black)" }}
                      >
                        {meta.icon} {r.label}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--mid)" }}>
                        {r.transit_days_estimate
                          ? `国际段约 ${r.transit_days_estimate} 天`
                          : "时效以每批为准"}
                        {r.frequency_label ? ` · ${r.frequency_label}` : ""}
                        {r.cutoff_note ? ` · ${r.cutoff_note}` : ""}
                      </p>
                    </div>
                    <p
                      className="font-display text-sm whitespace-nowrap"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {r.price_per_kg_cny
                        ? `参考价 ¥${r.price_per_kg_cny}/kg`
                        : "价格以每批报价为准"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--mid)" }}>
              价格以每批报价为准 — 具体咨询运营。
            </p>
          )}
          <p className="text-[11px] mt-3" style={{ color: "var(--mid)" }}>
            敏感货专线（含电池 / 化妆品 / 粉末等）价格 / 时效另行报价。
          </p>
        </section>

        {/* 02 — Payment (offline) */}
        <section
          className="brutal-container p-6"
          style={{ background: "var(--gold)" }}
        >
          <span className="section-number text-[64px]">02</span>
          <h2
            className="font-display text-2xl tracking-[0.1em] mb-2"
            style={{ color: "var(--black)" }}
          >
            付款方式 · OFFLINE
          </h2>
          <p className="text-sm" style={{ color: "var(--black)" }}>
            <strong>线下付款</strong>：取件时当面付，或微信转账给运营。
            <strong>本平台不做线上支付</strong> — 拼箱报价确认后或取件时，按运营指引付款即可。
          </p>
          {wechatContacts.length > 0 && (
            <p className="text-[11px] mt-3" style={{ color: "var(--black)" }}>
              付款 / 对接联系：
              {wechatContacts.map((c, i) => (
                <span key={c.id}>
                  {i > 0 ? "、" : ""}
                  {c.label}
                  {c.value && c.value !== "待配置" ? `（${c.value}）` : ""}
                </span>
              ))}
            </p>
          )}
        </section>

        {/* 03 — Liability / 理赔 */}
        <section
          className="brutal-container p-6"
          style={{ background: "var(--cream)" }}
        >
          <span className="section-number text-[64px]">03</span>
          <h2
            className="font-display text-2xl tracking-[0.1em] mb-3"
            style={{ color: "var(--black)" }}
          >
            保什么 / 不保什么
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="p-3 border-[2px] border-[var(--black)]"
              style={{ background: "var(--beige)" }}
            >
              <p
                className="font-display text-sm mb-2"
                style={{ color: "var(--black)" }}
              >
                ✓ BIA 负责
              </p>
              <ul
                className="text-xs list-disc pl-5 space-y-1"
                style={{ color: "var(--black)" }}
              >
                <li>国内仓库代收、上架、拼箱发运</li>
                <li>全程状态更新（在「我的包裹」可查）</li>
                <li>合规包裹在国际段丢失 / 损坏，协助跟进理赔</li>
              </ul>
            </div>
            <div
              className="p-3 border-[2px] border-[var(--black)]"
              style={{ background: "var(--beige)" }}
            >
              <p
                className="font-display text-sm mb-2"
                style={{ color: "var(--cardinal)" }}
              >
                ✗ BIA 不负责
              </p>
              <ul
                className="text-xs list-disc pl-5 space-y-1"
                style={{ color: "var(--mid)" }}
              >
                <li>因违禁 / 敏感品被海关查扣、退回或销毁的损失</li>
                <li>申报不实（瞒报、低报）导致的问题</li>
                <li>下错单 / 国内段快递造成的丢损</li>
              </ul>
            </div>
          </div>
          <p className="text-[11px] mt-3" style={{ color: "var(--mid)" }}>
            理赔以包裹申报信息为准 — 这也是预报时请如实填写金额的原因。
          </p>
        </section>

        {/* 04 — Prohibited & sensitive */}
        <section
          className="brutal-container p-6"
          style={{ background: "var(--cream)" }}
        >
          <span className="section-number text-[64px]">04</span>
          <h2
            className="font-display text-2xl tracking-[0.1em] mb-3"
            style={{ color: "var(--black)" }}
          >
            违禁 &amp; 敏感线物品
          </h2>
          <div
            className="p-3 border-[2px] border-[var(--black)] mb-3"
            style={{ background: "var(--beige)" }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--black)" }}>
              <strong>普通专线不允许</strong>：
            </p>
            <ul
              className="text-xs list-disc pl-5 space-y-1"
              style={{ color: "var(--mid)" }}
            >
              <li>锂电池 / 含电池的电子产品（充电宝、蓝牙耳机等）</li>
              <li>液体（化妆水、酒精、香水）</li>
              <li>粉末 / 食品（不同线路有限制，请先问）</li>
              <li>明火 / 易燃（打火机、喷雾）、仿冒 / 违禁物品</li>
            </ul>
          </div>
          <div
            className="p-3 border-[2px] border-[var(--black)]"
            style={{ background: "var(--gold)" }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--black)" }}>
              <strong>敏感货专线可以收</strong>（价格 / 时效另行报价）：
            </p>
            <ul
              className="text-xs list-disc pl-5 space-y-1"
              style={{ color: "var(--black)" }}
            >
              <li>含电池的电子产品（充电宝、蓝牙耳机、手机等）</li>
              <li>化妆品 / 液体、粉末类（蛋白粉、咖啡粉等）</li>
            </ul>
            <p className="text-[11px] mt-2" style={{ color: "var(--black)" }}>
              仍<strong>不允许</strong>：明火 / 易燃物、仿冒 / 违禁物品。
            </p>
          </div>
        </section>

        {/* 05 — Storage */}
        <section
          className="brutal-container p-6"
          style={{ background: "var(--cream)" }}
        >
          <span className="section-number text-[64px]">05</span>
          <h2
            className="font-display text-2xl tracking-[0.1em] mb-2"
            style={{ color: "var(--black)" }}
          >
            仓储与取件
          </h2>
          <ul
            className="text-sm list-disc pl-5 space-y-1"
            style={{ color: "var(--black)" }}
          >
            <li>签收后仓库免费暂存，等待拼箱发车。</li>
            <li>长期未发可能产生仓储费，具体以运营通知为准。</li>
            <li>到美国后凭 member ID 现场取件，按运营安排的时间 / 地点。</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
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
      </div>
    </div>
  );
}

export default function ShippingTermsPage() {
  return (
    <Suspense>
      <ProductShell group="services" page="shipping">
        {() => <TermsContent />}
      </ProductShell>
    </Suspense>
  );
}
