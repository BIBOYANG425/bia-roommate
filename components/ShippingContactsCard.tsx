"use client";

import { useState } from "react";
import type { ShippingContact, ShippingContactType } from "@/lib/types";

const CONTACT_ICONS: Record<ShippingContactType, string> = {
  wechat_group: "💬",
  wechat_personal: "💬",
  email: "✉️",
  george_bot: "🤖",
};

interface Props {
  contacts: ShippingContact[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] transition-colors hover:bg-[var(--gold)]"
      style={{ background: copied ? "var(--gold)" : "var(--cream)" }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

export default function ShippingContactsCard({ contacts }: Props) {
  if (contacts.length === 0) return null;

  return (
    <section
      className="brutal-container p-5"
      style={{ background: "var(--cream)" }}
    >
      <h2
        className="font-display text-lg tracking-[0.15em] mb-3"
        style={{ color: "var(--black)" }}
      >
        CONTACT / 联系我们
      </h2>
      <div className="space-y-3">
        {contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 p-3 border-[2px] border-[var(--black)]"
            style={{ background: "var(--beige)" }}
          >
            <span className="text-lg">{CONTACT_ICONS[c.type]}</span>
            <div className="flex-1 min-w-0">
              <p
                className="font-display text-sm tracking-wider"
                style={{ color: "var(--black)" }}
              >
                {c.label}
              </p>
              {c.type !== "wechat_group" || !c.qr_code_url ? (
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--mid)" }}
                >
                  {c.value}
                </p>
              ) : null}
            </div>
            {c.type === "wechat_group" && c.qr_code_url ? (
              <span
                className="font-display text-[10px] tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                扫码入群
              </span>
            ) : (
              <CopyButton text={c.value} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
