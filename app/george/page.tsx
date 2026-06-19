// app/george/page.tsx
// Public landing page for george onboarding (Spectrum shared-pool funnel).
// Gated behind the coming-soon flag (lib/features). When open, it shows the hero
// plus the shared GeorgeSignupForm (phone -> Spectrum-assigned line -> iMessage).
// The same form is reused ungated at /georgebeta for beta testers.
//
// Header last reviewed: 2026-06-18
"use client";

import ComingSoon from "@/components/ComingSoon";
import { isComingSoon } from "@/lib/features";
import GeorgeSignupForm from "./GeorgeSignupForm";

export default function GeorgeLanding() {
  if (isComingSoon("george")) {
    return <ComingSoon name={{ en: "George", zh: "George" }} />;
  }
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
        <GeorgeSignupForm />
      </div>
    </div>
  );
}
