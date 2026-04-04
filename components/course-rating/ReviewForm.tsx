"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";

const TERMS = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const terms: string[] = [];
  // Include next year through 10 years back so any recent student can review
  for (let y = year + 1; y >= year - 10; y--) {
    terms.push(`Fall ${y}`, `Summer ${y}`, `Spring ${y}`);
  }
  return terms;
})();

const GPA_OPTIONS = [
  "",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D",
  "F",
];

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
        {label}
      </label>
      <div
        role="radiogroup"
        aria-label={`${label} rating`}
        className="flex gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            tabIndex={value === n ? 0 : -1}
            onClick={() => onChange(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange(Math.min(n + 1, 5));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange(Math.max(n - 1, 1));
              }
            }}
            className={`w-11 h-11 border-[2px] border-[var(--black)] font-display text-sm cursor-pointer transition-colors ${
              value === n
                ? "bg-[var(--cardinal)] text-white"
                : "bg-[var(--cream)] text-[var(--black)] hover:bg-[var(--gold)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewForm({
  dept,
  courseNumber,
  professors,
  onSubmitted,
  onClose,
}: {
  dept: string;
  courseNumber: string;
  professors: string[];
  onSubmitted: () => void;
  onClose?: () => void;
}) {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [professor, setProfessor] = useState("");
  const [customProfessor, setCustomProfessor] = useState("");
  const [showCustomProfessor, setShowCustomProfessor] = useState(false);
  const [term, setTerm] = useState(TERMS[0]);
  const [difficulty, setDifficulty] = useState(3);
  const [workload, setWorkload] = useState(3);
  const [grading, setGrading] = useState(3);
  const [gpa, setGpa] = useState("");
  const [comment, setComment] = useState("");

  if (loading) {
    return (
      <div
        className="border-[3px] border-[var(--black)] p-6 animate-pulse"
        style={{ background: "var(--cream)" }}
      >
        <div className="h-5 w-40 mb-4" style={{ background: "var(--beige)" }} />
        <div className="h-10 w-full mb-3" style={{ background: "var(--beige)" }} />
        <div className="h-10 w-full" style={{ background: "var(--beige)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div
          className="border-[3px] border-[var(--cardinal)] p-6 text-center"
          style={{ background: "var(--cream)" }}
        >
          <p className="font-display text-lg mb-2">SIGN IN TO WRITE A REVIEW</p>
          <p className="font-mono text-[11px] text-[var(--mid)] mb-4">
            分享你的课程体验，帮助其他同学选课
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="brutal-btn brutal-btn-primary text-sm"
          >
            SIGN IN
          </button>
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/course-rating/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dept,
          course_number: courseNumber,
          professor: (showCustomProfessor ? customProfessor : professor) || undefined,
          term,
          difficulty,
          workload,
          grading,
          gpa: gpa || undefined,
          comment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit");
        return;
      }

      // Reset form
      setComment("");
      setGpa("");
      setProfessor("");
      setCustomProfessor("");
      setShowCustomProfessor(false);
      setDifficulty(3);
      setWorkload(3);
      setGrading(3);
      onSubmitted();
      onClose?.();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-[3px] border-[var(--black)] p-4"
      style={{ background: "var(--cream)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-sm tracking-wider">WRITE A REVIEW</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-display text-lg leading-none px-1 hover:text-[var(--cardinal)]"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Professor dropdown */}
        <div>
          <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
            教授
          </label>
          <select
            value={showCustomProfessor ? "__custom__" : professor}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setShowCustomProfessor(true);
                setProfessor("");
              } else {
                setShowCustomProfessor(false);
                setProfessor(e.target.value);
                setCustomProfessor("");
              }
            }}
            className="brutal-select w-full"
          >
            <option value="">Select professor</option>
            {professors.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="__custom__">+ Add new professor</option>
          </select>
          {showCustomProfessor && (
            <input
              type="text"
              value={customProfessor}
              onChange={(e) => setCustomProfessor(e.target.value)}
              placeholder="Professor name"
              className="brutal-input mt-2"
              autoFocus
            />
          )}
        </div>

        {/* Term */}
        <div>
          <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
            学期
          </label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="brutal-select w-full"
          >
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ratings */}
      <div className="flex flex-wrap gap-4 mb-4">
        <RatingSelector label="难度 Difficulty" value={difficulty} onChange={setDifficulty} />
        <RatingSelector label="工作量 Workload" value={workload} onChange={setWorkload} />
        <RatingSelector label="给分 Grading" value={grading} onChange={setGrading} />
      </div>

      {/* GPA */}
      <div className="mb-4">
        <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
          你的成绩 (optional)
        </label>
        <select
          value={gpa}
          onChange={(e) => setGpa(e.target.value)}
          className="brutal-select w-32"
        >
          {GPA_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g || "—"}
            </option>
          ))}
        </select>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="font-mono text-[11px] text-[var(--mid)] block mb-1">
          评价 (至少10字)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="brutal-input resize-y"
          placeholder="分享你对这门课的看法..."
          minLength={10}
          maxLength={2000}
        />
        <span className="font-mono text-[10px] text-[var(--mid)]">
          {comment.length}/2000
        </span>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-[var(--cardinal)] mb-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || comment.length < 10}
        className="brutal-btn brutal-btn-primary text-sm disabled:opacity-50"
      >
        {submitting ? "SUBMITTING..." : "SUBMIT REVIEW"}
      </button>
    </form>
  );
}
