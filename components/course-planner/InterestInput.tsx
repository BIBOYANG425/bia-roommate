"use client";

import { useState, useRef, useEffect } from "react";
import type { RecommendedCourse } from "@/lib/course-planner/recommender";
import type { AgentRecommendation } from "@/lib/course-planner/agent";

const QUICK_TAGS = [
  "Animation",
  "Film",
  "Coding",
  "AI",
  "Music",
  "Psychology",
  "Business",
  "Writing",
  "Art",
  "History",
  "Social Justice",
  "Biology",
  "Data Science",
  "Philosophy",
  "Theater",
];

interface InterestInputProps {
  semester: string;
  onResults: (
    results: RecommendedCourse[],
    agentResults?: AgentRecommendation[],
    mode?: string,
    agentFailed?: boolean,
  ) => void;
  onAgentSearch?: (
    interests: string,
    units: string | null,
    thinking: boolean,
    level: string | null,
  ) => void;
}

export default function InterestInput({
  semester,
  onResults,
  onAgentSearch,
}: InterestInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unitsFilter, setUnitsFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"auto" | "free">("auto");
  const [thinkingMode, setThinkingMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const UNIT_OPTIONS = ["1", "2", "3", "4"];

  async function handleSearch() {
    if (input.trim().length < 2) {
      setError(
        'TRY DESCRIBING SPECIFIC TOPICS LIKE "PSYCHOLOGY, FILM, CODING"',
      );
      return;
    }

    // AI mode → launch agent chat interface
    if (searchMode === "auto" && onAgentSearch) {
      onAgentSearch(input.trim(), unitsFilter, thinkingMode, levelFilter);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(20);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let progressInterval: ReturnType<typeof setInterval> | undefined;

    try {
      progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85));
      }, 400);

      const res = await fetch("/api/courses/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: input,
          semester,
          units: unitsFilter,
          level: levelFilter,
          mode: "free",
        }),
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      progressInterval = undefined;
      setProgress(95);

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.isRejection) {
          setError(
            errData.error ||
              "I CAN ONLY HELP WITH USC COURSE-RELATED QUESTIONS",
          );
        } else {
          setError("FAILED TO FIND COURSES — TRY DIFFERENT KEYWORDS");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProgress(100);

      // Handle both response formats: { recommendations, mode } or flat array (legacy)
      const recs = data.recommendations || data;
      const mode = data.mode;

      if (!Array.isArray(recs) || recs.length === 0) {
        setError("NO MATCHING COURSES FOUND — TRY BROADER TOPICS");
        setLoading(false);
        return;
      }

      if (mode === "agent") {
        // Agent mode: recs are AgentRecommendation[]
        // Convert to RecommendedCourse[] for backward compat + pass agent data
        const freeFormat: RecommendedCourse[] = recs.map(
          (r: AgentRecommendation) => ({
            department: r.department,
            number: r.number,
            title: r.title,
            units: r.units,
            description: r.description,
            relevanceScore: r.relevanceScore,
            matchReasons: r.matchReasons,
            geTag: r.geTag,
          }),
        );
        onResults(freeFormat, recs as AgentRecommendation[], mode);
      } else {
        onResults(
          recs as RecommendedCourse[],
          undefined,
          mode,
          !!data.agentFailed,
        );
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError("NETWORK ERROR — PLEASE TRY AGAIN");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  }

  function addTag(tag: string) {
    setInput((prev) => {
      const trimmed = prev.trim();
      const tokens = trimmed
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tokens.some((t) => t === tag.toLowerCase())) return prev;
      return trimmed ? `${trimmed}, ${tag.toLowerCase()}` : tag.toLowerCase();
    });
    setError(null);
  }

  return (
    <div>
      {/* Text input */}
      <textarea
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        aria-label="Describe your interests to find matching courses"
        placeholder="Describe your interests, hobbies, or topics you'd like to explore... (e.g., Japanese animation, social justice, and coding)"
        rows={3}
        className="w-full px-4 py-3 text-sm border-[2px] outline-none transition-colors resize-none"
        style={{
          borderColor: "var(--beige)",
          background: "white",
          color: "var(--black)",
          borderRadius: "4px",
          fontFamily: "var(--font-body), monospace",
        }}
        disabled={loading}
      />

      {/* Quick tags */}
      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {QUICK_TAGS.map((tag) => {
          const isSelected = input
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .includes(tag.toLowerCase());
          return (
            <button
              key={tag}
              onClick={() => addTag(tag)}
              disabled={loading}
              aria-pressed={isSelected}
              className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all hover:translate-y-[-1px]"
              style={{
                borderColor: "var(--beige)",
                background: isSelected ? "var(--gold)" : "white",
                color: "var(--black)",
                borderRadius: "20px",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Units filter */}
      <div className="mb-4">
        <span
          className="text-xs font-display tracking-wider mr-2"
          style={{ color: "var(--mid)" }}
        >
          UNITS:
        </span>
        <div className="inline-flex gap-2 flex-wrap">
          <button
            onClick={() => setUnitsFilter(null)}
            disabled={loading}
            aria-pressed={unitsFilter === null}
            className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all"
            style={{
              borderColor: "var(--beige)",
              background: unitsFilter === null ? "var(--cardinal)" : "white",
              color: unitsFilter === null ? "white" : "var(--black)",
              borderRadius: "20px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            ANY
          </button>
          {UNIT_OPTIONS.map((u) => (
            <button
              key={u}
              onClick={() => setUnitsFilter(unitsFilter === u ? null : u)}
              disabled={loading}
              aria-pressed={unitsFilter === u}
              className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all"
              style={{
                borderColor: "var(--beige)",
                background: unitsFilter === u ? "var(--cardinal)" : "white",
                color: unitsFilter === u ? "white" : "var(--black)",
                borderRadius: "20px",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Level filter */}
      <div className="mb-4">
        <span
          className="text-xs font-display tracking-wider mr-2"
          style={{ color: "var(--mid)" }}
        >
          LEVEL:
        </span>
        <div className="inline-flex gap-2 flex-wrap">
          {([
            { value: null, label: "ANY" },
            { value: "lower", label: "LOWER (100-299)" },
            { value: "upper", label: "UPPER (300-499)" },
            { value: "graduate", label: "GRADUATE (500+)" },
          ] as const).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setLevelFilter(levelFilter === opt.value ? null : opt.value)}
              disabled={loading}
              aria-pressed={levelFilter === opt.value}
              className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all"
              style={{
                borderColor: "var(--beige)",
                background: levelFilter === opt.value ? "var(--cardinal)" : "white",
                color: levelFilter === opt.value ? "white" : "var(--black)",
                borderRadius: "20px",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search mode toggle */}
      <div className="mb-4">
        <span
          className="text-xs font-display tracking-wider mr-2"
          style={{ color: "var(--mid)" }}
        >
          MODE:
        </span>
        <div className="inline-flex gap-2">
          <button
            onClick={() => setSearchMode("auto")}
            disabled={loading}
            aria-pressed={searchMode === "auto"}
            className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all"
            style={{
              borderColor:
                searchMode === "auto" ? "var(--cardinal)" : "var(--beige)",
              background: searchMode === "auto" ? "var(--cardinal)" : "white",
              color: searchMode === "auto" ? "white" : "var(--black)",
              borderRadius: "20px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            AI SEARCH
          </button>
          <button
            onClick={() => setSearchMode("free")}
            disabled={loading}
            aria-pressed={searchMode === "free"}
            className="px-3 py-1 text-xs font-display tracking-wider border-[1.5px] transition-all"
            style={{
              borderColor:
                searchMode === "free" ? "var(--cardinal)" : "var(--beige)",
              background: searchMode === "free" ? "var(--cardinal)" : "white",
              color: searchMode === "free" ? "white" : "var(--black)",
              borderRadius: "20px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            KEYWORD
          </button>
        </div>
      </div>

      {/* Thinking mode toggle (AI mode only) */}
      {searchMode === "auto" && (
        <div className="mb-4">
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-display tracking-wider border-[1.5px] transition-all"
            style={{
              borderColor: thinkingMode ? "var(--gold)" : "var(--beige)",
              background: thinkingMode
                ? "color-mix(in srgb, var(--gold) 20%, white)"
                : "white",
              color: "var(--black)",
              borderRadius: "20px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: "14px" }}>
              {thinkingMode ? "🧠" : "⚡"}
            </span>
            {thinkingMode ? "DEEP THINKING ON" : "FAST MODE"}
          </button>
          <p className="text-[10px] mt-1 ml-1" style={{ color: "var(--mid)" }}>
            {thinkingMode
              ? "AI will reason deeply about course fit — slower but more thoughtful"
              : "Quick AI analysis — faster results"}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs mb-3 font-display tracking-wider"
          style={{ color: "var(--cardinal)" }}
        >
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-4">
          <div
            className="w-full h-2 border-[1.5px] border-[var(--black)]"
            style={{ background: "var(--cream)", borderRadius: "2px" }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "var(--cardinal)",
                borderRadius: "1px",
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--mid)" }}>
            {searchMode === "auto"
              ? "AI agent is researching courses, professors, and student reviews..."
              : "Searching 5000+ courses for your interests..."}
          </p>
        </div>
      )}

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={loading || input.trim().length < 2}
        className="w-full py-3 font-display text-base tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
        style={{
          background: "var(--cardinal)",
          boxShadow: "3px 3px 0 var(--black)",
          opacity: loading || input.trim().length < 2 ? 0.6 : 1,
          borderRadius: "4px",
        }}
      >
        {loading
          ? searchMode === "auto"
            ? "AI SEARCHING..."
            : "SEARCHING..."
          : searchMode === "auto"
            ? "AI FIND COURSES →"
            : "FIND MATCHING COURSES →"}
      </button>
    </div>
  );
}
