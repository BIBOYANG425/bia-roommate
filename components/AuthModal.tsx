"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { isSchoolEmail } from "@/lib/auth";

type AuthLanguage = "en" | "zh";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  defaultMode?: "signin" | "signup";
  /** Language for the modal's own copy. Defaults to English so existing call
      sites keep working; product pages pass the shell's current language. */
  language?: AuthLanguage;
}

const AUTH_COPY: Record<
  AuthLanguage,
  {
    createTitle: string;
    signInTitle: string;
    createSubtitle: string;
    signInSubtitle: string;
    accepted: string;
    passwordCreate: string;
    password: string;
    creating: string;
    signingIn: string;
    createAccount: string;
    signIn: string;
    noAccount: string;
    haveAccount: string;
    signUpLink: string;
    signInLink: string;
    checkEmail: string;
    sentLinkTo: string;
    activateHint: string;
    gotIt: string;
  }
> = {
  en: {
    createTitle: "CREATE ACCOUNT",
    signInTitle: "SIGN IN",
    createSubtitle: "Use your school email to create an account",
    signInSubtitle: "Sign in with your school email and password",
    accepted: "ACCEPTED: .usc.edu, .berkeley.edu, .stanford.edu",
    passwordCreate: "Create a password (6+ chars)",
    password: "Password",
    creating: "CREATING...",
    signingIn: "SIGNING IN...",
    createAccount: "CREATE ACCOUNT",
    signIn: "SIGN IN",
    noAccount: "Don't have an account? ",
    haveAccount: "Already have an account? ",
    signUpLink: "Sign up",
    signInLink: "Sign in",
    checkEmail: "CHECK YOUR EMAIL",
    sentLinkTo: "We sent a verification link to",
    activateHint:
      "Click the link in the email to activate your account, then sign in.",
    gotIt: "GOT IT",
  },
  zh: {
    createTitle: "注册账号",
    signInTitle: "登录",
    createSubtitle: "使用学校邮箱注册账号",
    signInSubtitle: "使用学校邮箱和密码登录",
    accepted: "支持邮箱：.usc.edu, .berkeley.edu, .stanford.edu",
    passwordCreate: "设置密码（至少 6 位）",
    password: "密码",
    creating: "注册中...",
    signingIn: "登录中...",
    createAccount: "注册账号",
    signIn: "登录",
    noAccount: "还没有账号？",
    haveAccount: "已有账号？",
    signUpLink: "注册",
    signInLink: "登录",
    checkEmail: "请查收邮箱",
    sentLinkTo: "我们已发送验证链接至",
    activateHint: "点击邮件中的链接激活账号，然后登录。",
    gotIt: "知道了",
  },
};

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  defaultMode = "signin",
  language = "en",
}: AuthModalProps) {
  const { signUp, signIn } = useAuth();
  const copy = AUTH_COPY[language];
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
      if (mode === "signup") {
        // Show "check your email" message — don't redirect
      } else {
        // Sign in — redirect to onboarding if no profile, otherwise close
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => handleClose(), 500);
        }
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
    title || (mode === "signup" ? copy.createTitle : copy.signInTitle);
  const displaySubtitle =
    subtitle || (mode === "signup" ? copy.createSubtitle : copy.signInSubtitle);

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
          /* ── Sign Up Success — verify email ── */
          <div className="text-center py-4">
            <div className="text-4xl mb-3">&#9993;</div>
            <h2
              className="font-display text-xl tracking-wider mb-2"
              style={{ color: "var(--black)" }}
            >
              {copy.checkEmail}
            </h2>
            <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
              {copy.sentLinkTo}
            </p>
            <p className="text-sm mb-4">
              <strong style={{ color: "var(--black)" }}>{email}</strong>
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--mid)" }}>
              {copy.activateHint}
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 font-display text-sm tracking-wider text-white border-[3px] border-[var(--black)]"
              style={{
                background: "var(--cardinal)",
                boxShadow: "3px 3px 0 var(--black)",
              }}
            >
              {copy.gotIt}
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
                {copy.accepted}
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={
                  mode === "signup" ? copy.passwordCreate : copy.password
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
                    ? copy.creating
                    : copy.signingIn
                  : mode === "signup"
                    ? copy.createAccount
                    : copy.signIn}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--mid)" }}
            >
              {mode === "signin" ? copy.noAccount : copy.haveAccount}
              <button
                onClick={switchMode}
                className="underline"
                style={{ color: "var(--cardinal)" }}
              >
                {mode === "signin" ? copy.signUpLink : copy.signInLink}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
