// app/george/page.tsx
// Public landing page for george onboarding (Spectrum shared-pool funnel).
// The student picks a country code and enters THEIR phone number; the page
// combines them into E.164 and the backend registers it as a shared
// Spectrum user and the pool ASSIGNS them a number to text (it differs per
// user — there is no single george number on the free plan). A confirm panel
// then opens iMessage to their assigned number with a prefilled "Hi".
//
// The "&body=" sms format is required on iOS 14+ for prefilled body. Do not
// change to "?body=" — that format is deprecated and breaks on some iOS versions.
// Header last reviewed: 2026-06-18
"use client";

import { useState } from "react";
import ComingSoon from "@/components/ComingSoon";
import { isComingSoon } from "@/lib/features";

// Country codes for the picker. Tuned for BIA's international student body
// (China + HK/TW/Macau, plus other common origins). +1 first as the default.
const COUNTRY_CODES: { dial: string; label: string }[] = [
  { dial: "+1", label: "🇺🇸 +1" },
  { dial: "+86", label: "🇨🇳 +86" },
  { dial: "+852", label: "🇭🇰 +852" },
  { dial: "+886", label: "🇹🇼 +886" },
  { dial: "+853", label: "🇲🇴 +853" },
  { dial: "+44", label: "🇬🇧 +44" },
  { dial: "+65", label: "🇸🇬 +65" },
  { dial: "+82", label: "🇰🇷 +82" },
  { dial: "+81", label: "🇯🇵 +81" },
  { dial: "+61", label: "🇦🇺 +61" },
];

type Step =
  | { name: "form" }
  | { name: "loading" }
  | { name: "ready"; assigned: string; alreadyOnboarded: boolean }
  | { name: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  invalid_phone: "that doesn't look like a valid number. pick your country code and try again",
  rate_limited: "slow down a sec, try again in a minute",
  pool_unavailable: "we're out of lines right now 🥲 ping us @bia and we'll fix it",
  not_configured: "setup hiccup on our side — try again later",
  spectrum_error: "couldn't reach the message service — try again in a bit",
};

export default function GeorgeLanding() {
  if (isComingSoon("george")) {
    return <ComingSoon name={{ en: "George", zh: "George" }} />;
  }
  return <GeorgeLandingInner />;
}

function GeorgeLandingInner() {
  const [dialCode, setDialCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>({ name: "form" });

  async function signUp() {
    // Combine the chosen country code with the typed number into E.164. If the
    // student typed a full +number themselves, respect it. Strip a leading trunk
    // 0 (some countries write it locally) before prepending the dial code.
    const local = phone.replace(/\D/g, "").replace(/^0+/, "");
    const e164 = phone.trim().startsWith("+")
      ? phone.replace(/[^\d+]/g, "")
      : `${dialCode}${local}`;
    setStep({ name: "loading" });
    try {
      const res = await fetch("/george/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStep({ name: "error", message: ERROR_COPY[data.error] ?? ERROR_COPY.spectrum_error });
        return;
      }
      setStep({
        name: "ready",
        assigned: data.assignedPhoneNumber,
        alreadyOnboarded: !!data.alreadyOnboarded,
      });
    } catch {
      setStep({ name: "error", message: ERROR_COPY.spectrum_error });
    }
  }

  const smsLink =
    step.name === "ready" ? `sms:${step.assigned}&body=${encodeURIComponent("Hi")}` : "#";

  return (
    <div
      style={{
        background: "var(--cream)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 480, padding: "3rem", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            fontStyle: "italic",
            color: "var(--cardinal)",
          }}
        >
          george
        </h1>
        <p style={{ color: "var(--mid)", marginTop: "1rem" }}>
          your bia agent. usc-savvy. lives in iMessage.
        </p>

        {step.name !== "ready" ? (
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                aria-label="country code"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                className="brutal-input"
                style={{ minHeight: 44, flex: "0 0 auto" }}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.dial} value={c.dial}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="your phone number"
                aria-label="your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && step.name !== "loading") signUp();
                }}
                className="brutal-input"
                style={{ flex: 1, textAlign: "center", minHeight: 44 }}
              />
            </div>
            <button
              onClick={signUp}
              disabled={step.name === "loading"}
              className="brutal-btn brutal-btn-primary"
              style={{ marginTop: "1rem", width: "100%", minHeight: 44 }}
            >
              {step.name === "loading" ? "getting your line…" : "Text george"}
            </button>
            {step.name === "error" && (
              <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--cardinal)" }}>
                {step.message}
              </p>
            )}
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--mid)" }}>
              we assign you a direct line to george — takes 2 seconds.
            </p>
          </div>
        ) : (
          <div className="brutal-card" style={{ marginTop: "2rem", padding: "1.5rem" }}>
            <p style={{ fontFamily: "var(--font-display)", color: "var(--black)" }}>
              {step.alreadyOnboarded ? "welcome back — your line is" : "your line to george is"}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                color: "var(--cardinal)",
                margin: "0.5rem 0 1rem",
              }}
            >
              {step.assigned}
            </p>
            <a
              href={smsLink}
              className="brutal-btn brutal-btn-primary"
              style={{ display: "inline-block", width: "100%", minHeight: 44 }}
            >
              OK — open iMessage
            </a>
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--mid)" }}>
              just hit send on the &quot;Hi&quot; — george takes it from there.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
