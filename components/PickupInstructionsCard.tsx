"use client";

import type { Shipment } from "@/lib/types";

interface Props {
  shipment?: Shipment | null;
}

export default function PickupInstructionsCard({ shipment }: Props) {
  return (
    <div
      className="p-5 border-[3px] border-[var(--black)]"
      style={{ background: "var(--gold)" }}
    >
      <h3
        className="font-display text-lg tracking-[0.15em] mb-3"
        style={{ color: "var(--black)" }}
      >
        PICKUP / 取件须知
      </h3>
      <ol
        className="space-y-2 text-sm list-decimal pl-5"
        style={{ color: "var(--black)" }}
      >
        <li>George 会通过微信群 / iMessage 通知取件时间和地点</li>
        <li>
          取件时请带好 <strong>学生证</strong> + 报上你的{" "}
          <strong>Member ID</strong>
        </li>
        <li>现场核实身份后领取包裹</li>
      </ol>

      {shipment?.pickup_location && (
        <div className="mt-3 pt-3 border-t-[2px] border-[var(--black)]">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--black)", opacity: 0.6 }}
              >
                取件地点
              </dt>
              <dd style={{ color: "var(--black)" }}>
                {shipment.pickup_location}
              </dd>
            </div>
            {shipment.pickup_starts_at && shipment.pickup_ends_at && (
              <div>
                <dt
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--black)", opacity: 0.6 }}
                >
                  取件窗口
                </dt>
                <dd style={{ color: "var(--black)" }}>
                  {new Date(shipment.pickup_starts_at).toLocaleString("zh-CN")}{" "}
                  —{" "}
                  {new Date(shipment.pickup_ends_at).toLocaleTimeString("zh-CN")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
