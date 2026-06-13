"use client";

import { useState, FormEvent } from "react";

export interface SquadDraft {
  category?: string;
  content?: string;
  location?: string;
  deadline?: string;
  max_people?: number;
  gender_restriction?: string;
}

interface DescribeBoxProps {
  onDraft: (draft: SquadDraft) => void;
}

type BoxState = "idle" | "loading" | "error_category" | "hidden";

export default function DescribeBox({ onDraft }: DescribeBoxProps) {
  const [text, setText] = useState("");
  const [boxState, setBoxState] = useState<BoxState>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || boxState === "loading") return;

    setBoxState("loading");
    try {
      const res = await fetch("/api/squad/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.status === 422) {
        setBoxState("error_category");
        return;
      }

      if (!res.ok) {
        // Any other error — silently hide so form is never blocked
        setBoxState("hidden");
        return;
      }

      const data = (await res.json()) as { draft?: SquadDraft };
      if (data.draft) {
        onDraft(data.draft);
      }
      setBoxState("idle");
      setText("");
    } catch {
      // Network error — silently hide
      setBoxState("hidden");
    }
  }

  // Silently hide on unrecoverable errors; form is always left intact
  if (boxState === "hidden") return null;

  return (
    <div
      className="border-[3px] border-[var(--black)] p-4 mb-2"
      style={{ background: "var(--beige)" }}
    >
      <label
        className="font-display text-sm tracking-[0.08em] block mb-3"
        style={{ color: "var(--black)" }}
      >
        懒得填？描述一句，george 帮你填
      </label>
      <form onSubmit={handleSubmit} className="flex gap-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 周六去 Joshua Tree 爬山，找 2 个搭子..."
          maxLength={200}
          disabled={boxState === "loading"}
          className="brutal-input flex-1 border-r-0"
          style={{ opacity: boxState === "loading" ? 0.7 : 1 }}
        />
        <button
          type="submit"
          disabled={!text.trim() || boxState === "loading"}
          className="font-display text-sm px-5 py-2 border-[3px] border-[var(--black)] transition-colors"
          style={{
            background:
              !text.trim() || boxState === "loading"
                ? "var(--cream)"
                : "var(--black)",
            color:
              !text.trim() || boxState === "loading"
                ? "var(--mid)"
                : "var(--gold)",
            whiteSpace: "nowrap",
          }}
        >
          {boxState === "loading" ? "george 正在帮你写…" : "帮我填"}
        </button>
      </form>

      {boxState === "error_category" && (
        <p
          className="text-[11px] mt-2"
          style={{ color: "var(--cardinal)" }}
        >
          这个不太合适哈 换个描述?
        </p>
      )}
    </div>
  );
}
