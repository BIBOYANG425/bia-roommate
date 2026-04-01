"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { isSchoolEmail } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  defaultMode?: "signin" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  defaultMode = "signin",
}: AuthModalProps) {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const emailValid = email.length > 0 && isSchoolEmail(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const { error: err } =
      mode === "signup"
        ? await signUp(email, password)
        : await signIn(email, password);

    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      } else if (mode === "signup") {
        // New users go to onboarding to create their profile
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 500);
      } else {
        // Sign in — just close
        setTimeout(() => handleClose(), 500);
      }
    }
  }

  function handleClose() {
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
    setSuccess(false);
    setMode(defaultMode);
    onClose();
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setSuccess(false);
  }

  const displayTitle =
    title || (mode === "signup" ? "CREATE ACCOUNT" : "SIGN IN");
  const displaySubtitle =
    subtitle ||
    (mode === "signup"
      ? "Use your school email to create an account"
      : "Sign in with your school email and password");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(26, 20, 16, 0.85)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm border-[3px] border-[var(--black)] p-6"
        style={{ background: "#FAF6EC", boxShadow: "6px 6px 0 var(--black)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="float-right font-display text-lg leading-none hover:opacity-60"
          style={{ color: "var(--mid)" }}
        >
          X
        </button>

        {success && mode === "signup" ? (
          /* ── Sign Up Success ── */
          <div className="text-center py-4">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2
              className="font-display text-xl tracking-wider mb-2"
              style={{ color: "var(--black)" }}
            >
              ACCOUNT CREATED
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--mid)" }}>
              You&apos;re now signed in as{" "}
              <strong style={{ color: "var(--black)" }}>{email}</strong>
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 font-display text-sm tracking-wider text-white border-[3px] border-[var(--black)]"
              style={{
                background: "var(--cardinal)",
                boxShadow: "3px 3px 0 var(--black)",
              }}
            >
              CONTINUE
            </button>
          </div>
        ) : (
          /* ── Email + Password Form ── */
          <>
            <h2
              className="font-display text-2xl tracking-wider mb-1"
              style={{ color: "var(--black)" }}
            >
              {displayTitle}
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--mid)" }}>
              {displaySubtitle}
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@usc.edu"
                className="w-full px-3 py-3 border-[3px] border-[var(--black)] text-sm mb-1 outline-none"
                style={{ background: "white", fontFamily: "inherit" }}
                autoFocus
              />

              <div
                className="text-[10px] mb-3 font-display tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                ACCEPTED: .usc.edu, .berkeley.edu, .stanford.edu
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={
                  mode === "signup"
                    ? "Create a password (6+ chars)"
                    : "Password"
                }
                className="w-full px-3 py-3 border-[3px] border-[var(--black)] text-sm mb-3 outline-none"
                style={{ background: "white", fontFamily: "inherit" }}
              />

              {error && (
                <div
                  className="text-xs mb-3 px-3 py-2 border-[2px]"
                  style={{
                    borderColor: "var(--cardinal)",
                    color: "var(--cardinal)",
                    background: "color-mix(in srgb, var(--cardinal) 5%, white)",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 font-display text-sm tracking-wider text-white border-[3px] border-[var(--black)] transition-all"
                style={{
                  background: canSubmit ? "var(--cardinal)" : "var(--mid)",
                  boxShadow: canSubmit ? "4px 4px 0 var(--black)" : "none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {loading
                  ? mode === "signup"
                    ? "CREATING..."
                    : "SIGNING IN..."
                  : mode === "signup"
                    ? "CREATE ACCOUNT"
                    : "SIGN IN"}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--mid)" }}
            >
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                onClick={switchMode}
                className="underline"
                style={{ color: "var(--cardinal)" }}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
