// app/georgebeta/page.tsx
// Beta tester entry for George. Runs the SAME signup flow as /george (phone +
// country code -> Spectrum-assigned line -> open iMessage) via the shared
// GeorgeSignupForm, but ungated — /george is paused behind the coming-soon flag
// (lib/features), so beta testers come here to actually onboard. Adds beta
// framing, a web-chat fallback, and a structured feedback form (POST /api/feedback).
//
// Header last reviewed: 2026-06-18
"use client";

import { useState } from "react";
import Link from "next/link";
import GeorgeSignupForm from "../george/GeorgeSignupForm";

const TRY_PROMPTS = [
  "where's the best matcha near campus?",
  "which writ150 prof should I take?",
  "what's actually happening this weekend?",
  "introduce me to someone who's also into startups",
  "is the library safe to walk back from at 11pm?",
];

type FeedbackState =
  | { name: "idle" }
  | { name: "sending" }
  | { name: "ok" }
  | { name: "error"; message: string };

export default function GeorgeBeta() {
  const [category, setCategory] = useState<"bug" | "feature" | "general">("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [fb, setFb] = useState<FeedbackState>({ name: "idle" });

  async function submitFeedback() {
    if (message.trim().length < 10) {
      setFb({ name: "error", message: "tell us a bit more (at least 10 characters)" });
      return;
    }
    setFb({ name: "sending" });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          path: "/georgebeta",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFb({ name: "error", message: data.error ?? "couldn't send, try again in a sec" });
        return;
      }
      setFb({ name: "ok" });
      setMessage("");
    } catch {
      setFb({ name: "error", message: "couldn't send, try again in a sec" });
    }
  }

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh", padding: "3rem 1rem" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        {/* Hero */}
        <span className="brutal-tag brutal-tag-gold">private beta</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            fontStyle: "italic",
            color: "var(--cardinal)",
            margin: "0.75rem 0 0",
          }}
        >
          george
        </h1>
        <p style={{ color: "var(--mid)", marginTop: "0.75rem" }}>
          the AI senior who lives in your iMessage. enter your number, we match
          you a private line, you text it. you are a beta tester, so things will
          break and what you flag shapes it.
        </p>

        {/* The actual signup flow (same as /george) */}
        <GeorgeSignupForm />

        {/* Reliability note + web-chat fallback */}
        <p style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--mid)" }}>
          iMessage runs through a provider that has been flaky lately. if george
          goes quiet, that is usually the provider, not you.{" "}
          <Link href="/george/chat" style={{ color: "var(--cardinal)" }}>
            prefer the browser? try web chat
          </Link>
          .
        </p>

        {/* What to try */}
        <div style={{ marginTop: "2rem" }}>
          <p style={{ fontFamily: "var(--font-display)", color: "var(--black)", marginBottom: "0.75rem" }}>
            stuff worth asking
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            {TRY_PROMPTS.map((p) => (
              <span key={p} className="brutal-tag" style={{ fontSize: "0.8rem" }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="brutal-card" style={{ marginTop: "2rem", padding: "1.5rem", textAlign: "left" }}>
          <p style={{ fontFamily: "var(--font-display)", color: "var(--black)", marginBottom: "0.25rem" }}>
            found something off? tell us
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--mid)", marginBottom: "1rem" }}>
            a weird answer, a wrong fact, something that broke. all of it helps.
          </p>

          {fb.name === "ok" ? (
            <p style={{ color: "var(--cardinal)", fontFamily: "var(--font-display)" }}>
              got it, thank you. keep them coming.
            </p>
          ) : (
            <>
              <select
                aria-label="feedback type"
                value={category}
                onChange={(e) => setCategory(e.target.value as "bug" | "feature" | "general")}
                className="brutal-input"
                style={{ width: "100%", minHeight: 44, marginBottom: "0.75rem" }}
              >
                <option value="bug">something is broken / wrong</option>
                <option value="feature">i wish it could…</option>
                <option value="general">general thoughts</option>
              </select>
              <textarea
                aria-label="feedback message"
                placeholder="what happened? the more specific, the better."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="brutal-input"
                style={{ width: "100%", minHeight: 110, marginBottom: "0.75rem", resize: "vertical" }}
              />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="email (optional, if you want a reply)"
                aria-label="email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input"
                style={{ width: "100%", minHeight: 44, marginBottom: "0.75rem" }}
              />
              <button
                onClick={submitFeedback}
                disabled={fb.name === "sending"}
                className="brutal-btn brutal-btn-gold"
                style={{ width: "100%", minHeight: 44 }}
              >
                {fb.name === "sending" ? "sending…" : "send feedback"}
              </button>
              {fb.name === "error" && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--cardinal)" }}>
                  {fb.message}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "var(--mid)" }}>
          BIA · need a human? <a href="mailto:bia@usc.edu">bia@usc.edu</a> · IG{" "}
          <a href="https://instagram.com/bia_usc" target="_blank" rel="noreferrer">
            @bia_usc
          </a>
        </p>
      </div>
    </div>
  );
}
