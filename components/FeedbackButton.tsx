"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Category = "bug" | "feature" | "general";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug / something broken" },
  { value: "feature", label: "Feature request" },
];

export default function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setCategory("general");
    setMessage("");
    setEmail("");
    setError(null);
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError("Message must be at least 10 characters.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Message must be 2000 characters or fewer.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmed,
          email: email.trim() || undefined,
          path: pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to submit feedback.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="font-display tracking-[0.15em] text-xs sm:text-sm"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 50,
          padding: "10px 16px",
          background: "var(--cardinal)",
          color: "white",
          border: "3px solid var(--black)",
          boxShadow: "4px 4px 0 var(--black)",
          cursor: "pointer",
        }}
      >
        FEEDBACK
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(26,20,16,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: 480,
              background: "var(--cream)",
              border: "3px solid var(--black)",
              boxShadow: "6px 6px 0 var(--black)",
              padding: 20,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="feedback-title"
                className="font-display tracking-wider text-base"
              >
                SEND FEEDBACK
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close feedback"
                className="font-display text-lg leading-none px-2 hover:text-[var(--cardinal)]"
              >
                ✕
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <p className="font-display text-lg mb-2">THANKS!</p>
                <p className="font-mono text-[11px] text-[var(--mid)] mb-4">
                  We read every message.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                    }}
                    className="brutal-btn text-sm"
                  >
                    SEND ANOTHER
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setOpen(false);
                    }}
                    className="brutal-btn brutal-btn-primary text-sm"
                  >
                    DONE
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="brutal-select w-full"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
                    Message (10–2000 chars)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="brutal-input resize-y w-full"
                    placeholder="What's on your mind? 中英文都行。"
                    minLength={10}
                    maxLength={2000}
                    required
                  />
                  <span className="font-mono text-[10px] text-[var(--mid)]">
                    {message.length}/2000
                  </span>
                </div>

                <div className="mb-4">
                  <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
                    Email (optional — only if you want a reply)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="brutal-input w-full"
                  />
                </div>

                {error && (
                  <p className="font-mono text-[11px] text-[var(--cardinal)] mb-3">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="brutal-btn text-sm"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || message.trim().length < 10}
                    className="brutal-btn brutal-btn-primary text-sm disabled:opacity-50"
                  >
                    {submitting ? "SENDING..." : "SEND"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
