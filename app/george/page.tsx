// app/george/page.tsx
// Public landing page for george onboarding.
// The student enters THEIR phone number; the backend mints a pending handshake
// code pre-linked to that handle and returns george's ONE shared iMessage number
// (GEORGE_IMESSAGE_PHONE). A confirm panel then opens iMessage to that single
// number with a prefilled "...george (code)" message — the code (and sender
// handle) bind identity in george's handshake. There is no per-user number on
// the shared plan; everyone texts the same line.
//
// The "&body=" sms format is required on iOS 14+ for prefilled body. Do not
// change to "?body=" — that format is deprecated and breaks on some iOS versions.
// Header last reviewed: 2026-06-12
"use client";

import { useState } from "react";

type Step =
  | { name: "form" }
  | { name: "loading" }
  | { name: "ready"; georgeNumber: string; code: string | null; alreadyOnboarded: boolean }
  | { name: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  invalid_phone: "that doesn't look like a US phone number — try like 213-555-0123",
  rate_limited: "slow down a sec, try again in a minute",
  not_configured: "setup hiccup on our side — try again later",
  spectrum_error: "couldn't reach the message service — try again in a bit",
};

export default function GeorgeLanding() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>({ name: "form" });

  async function signUp() {
    setStep({ name: "loading" });
    try {
      const res = await fetch("/george/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStep({ name: "error", message: ERROR_COPY[data.error] ?? ERROR_COPY.spectrum_error });
        return;
      }
      setStep({
        name: "ready",
        georgeNumber: data.georgeNumber,
        code: typeof data.code === "string" ? data.code : null,
        alreadyOnboarded: !!data.alreadyOnboarded,
      });
    } catch {
      setStep({ name: "error", message: ERROR_COPY.spectrum_error });
    }
  }

  // Prefill the handshake message. The natural format "...george (code)" is what
  // george's extractCodeFromStartMessage parses; the code binds identity even if
  // the student's iMessage sends from an Apple ID email rather than their number.
  const smsBody =
    step.name === "ready" && step.code
      ? `i'm ready to try george (${step.code})`
      : "Hi";
  const smsLink =
    step.name === "ready"
      ? `sms:${step.georgeNumber}&body=${encodeURIComponent(smsBody)}`
      : "#";

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
              style={{ width: "100%", textAlign: "center", minHeight: 44 }}
            />
            <button
              onClick={signUp}
              disabled={step.name === "loading"}
              className="brutal-btn brutal-btn-primary"
              style={{ marginTop: "1rem", width: "100%", minHeight: 44 }}
            >
              {step.name === "loading" ? "setting you up…" : "Text george"}
            </button>
            {step.name === "error" && (
              <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--cardinal)" }}>
                {step.message}
              </p>
            )}
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--mid)" }}>
              george lives in iMessage. we&apos;ll open it with your hello — takes 2 seconds.
            </p>
          </div>
        ) : (
          <div className="brutal-card" style={{ marginTop: "2rem", padding: "1.5rem" }}>
            <p style={{ fontFamily: "var(--font-display)", color: "var(--black)" }}>
              {step.alreadyOnboarded ? "welcome back — text george at" : "text george at"}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                color: "var(--cardinal)",
                margin: "0.5rem 0 1rem",
              }}
            >
              {step.georgeNumber}
            </p>
            <a
              href={smsLink}
              className="brutal-btn brutal-btn-primary"
              style={{ display: "inline-block", width: "100%", minHeight: 44 }}
            >
              OK — open iMessage
            </a>
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--mid)" }}>
              just hit send — george takes it from there.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
