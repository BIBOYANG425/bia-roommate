"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AgentRecommendation,
  AgentEvent,
} from "@/lib/course-planner/agent";
import type {
  ClarifyingQuestion,
  IntakeConstraints,
} from "@/lib/course-planner/agent/types";

interface ChatMessage {
  id: string;
  role: "agent" | "status" | "reasoning" | "result";
  content: string;
  source?: "catalog" | "rmp" | "reddit";
  step?: "interpreter" | "recommender";
  done?: boolean;
  data?: AgentEvent;
}

interface AgentChatProps {
  interests: string;
  semester: string;
  unitsFilter: string | null;
  levelFilter: string | null;
  thinking: boolean;
  /** UI-captured hard constraints (year, GE needed, prof rating floor). */
  intake: IntakeConstraints;
  onResults: (results: AgentRecommendation[]) => void;
  onBack: () => void;
}

// ─── Source label styling ───
const SOURCE_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  catalog: {
    bg: "color-mix(in srgb, var(--cardinal) 12%, white)",
    color: "var(--cardinal)",
    label: "USC CATALOG",
  },
  rmp: {
    bg: "color-mix(in srgb, #2E7D32 12%, white)",
    color: "#2E7D32",
    label: "RATEMYPROF",
  },
  reddit: {
    bg: "color-mix(in srgb, #FF4500 12%, white)",
    color: "#FF4500",
    label: "r/USC",
  },
};

// ─── Expandable Course Card ───
function CourseCard({
  rec,
  onAdd,
  isAdded,
  canAdd,
}: {
  rec: AgentRecommendation;
  onAdd: () => void;
  isAdded: boolean;
  canAdd: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    rec.aiReasoning || rec.communityHighlights?.length > 0 || rec.topInstructor;

  return (
    <div
      className="border-[2px] transition-all"
      style={{
        borderColor: isAdded ? "var(--cardinal)" : "var(--beige)",
        background: isAdded
          ? "color-mix(in srgb, var(--cardinal) 4%, white)"
          : "white",
        borderRadius: "4px",
      }}
    >
      {/* Header row */}
      <div className="p-4 flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="font-display text-base tracking-wider"
              style={{ color: "var(--cardinal)" }}
            >
              {rec.department} {rec.number}
            </span>
            {rec.geTag && (
              <span
                className="px-2 py-0.5 text-[10px] font-display tracking-wider"
                style={{
                  background: "var(--gold)",
                  color: "var(--black)",
                  borderRadius: "3px",
                }}
              >
                {rec.geTag}
              </span>
            )}
            {rec.units && (
              <span className="text-[10px]" style={{ color: "var(--mid)" }}>
                {rec.units} units
              </span>
            )}
            <span
              className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
              style={{
                background: "var(--cardinal)",
                color: "white",
                borderRadius: "3px",
              }}
            >
              {rec.relevanceScore?.toFixed(1)}/10
            </span>
          </div>

          <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
            {rec.title}
          </p>

          {/* Section-level recommendation (GESM/WRIT): show time + instructor */}
          {rec.sectionId && (
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {rec.sectionTime && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-display tracking-wider"
                  style={{
                    background:
                      "color-mix(in srgb, var(--cardinal) 10%, white)",
                    color: "var(--cardinal)",
                    borderRadius: "3px",
                  }}
                >
                  {rec.sectionTime}
                </span>
              )}
              {rec.sectionInstructor && (
                <span className="text-[11px]" style={{ color: "var(--black)" }}>
                  {rec.sectionInstructor}
                </span>
              )}
            </div>
          )}

          {/* Section topics for non-section-level recs (fallback) */}
          {!rec.sectionId &&
            rec.sectionTopics &&
            rec.sectionTopics.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {rec.sectionTopics.slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className="px-1.5 py-0.5 text-[10px]"
                    style={{
                      background:
                        "color-mix(in srgb, var(--cardinal) 8%, white)",
                      color: "var(--cardinal)",
                      borderRadius: "3px",
                    }}
                  >
                    {topic}
                  </span>
                ))}
                {rec.sectionTopics.length > 4 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px]"
                    style={{ color: "var(--mid)" }}
                  >
                    +{rec.sectionTopics.length - 4} more
                  </span>
                )}
              </div>
            )}

          {/* Suggested lecturer (for non-section recs) */}
          {!rec.sectionId && rec.suggestedInstructor && (
            <p className="text-[11px] mb-0.5" style={{ color: "var(--mid)" }}>
              <span style={{ color: "var(--black)" }}>Suggested:</span>{" "}
              {rec.suggestedInstructor}
            </p>
          )}

          {/* Compact preview of why */}
          {rec.aiReasoning && (
            <p className="text-xs line-clamp-2" style={{ color: "var(--mid)" }}>
              {rec.aiReasoning}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <button
            onClick={onAdd}
            disabled={isAdded || !canAdd}
            className="px-3 py-2 text-xs font-display tracking-wider border-[2px] transition-all"
            style={{
              borderColor: isAdded ? "var(--cardinal)" : "var(--black)",
              background: isAdded ? "var(--cardinal)" : "white",
              color: isAdded ? "white" : "var(--black)",
              borderRadius: "4px",
              opacity: isAdded || !canAdd ? 0.6 : 1,
            }}
          >
            {isAdded ? "ADDED" : "+ ADD"}
          </button>
        </div>
      </div>

      {/* Expand/collapse toggle */}
      {hasDetails && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-[11px] font-display tracking-wider text-left flex items-center gap-1 transition-colors hover:bg-[color-mix(in_srgb,var(--beige)_20%,white)]"
          style={{
            color: "var(--cardinal)",
            borderTop: "1px solid var(--beige)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: expanded ? "rotate(90deg)" : "rotate(0)",
              transition: "transform 0.15s",
            }}
          >
            &#9656;
          </span>
          {expanded
            ? "HIDE DETAILS"
            : "WHY THIS COURSE? — VIEW AI REASONING & SOURCES"}
        </button>
      )}

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--beige)" }}
        >
          {/* AI Reasoning */}
          {rec.aiReasoning && (
            <div className="pt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{
                    background:
                      "color-mix(in srgb, var(--cardinal) 12%, white)",
                    color: "var(--cardinal)",
                    borderRadius: "2px",
                  }}
                >
                  AI ANALYSIS
                </span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--black)" }}
              >
                {rec.aiReasoning}
              </p>
            </div>
          )}

          {/* Course description */}
          {rec.description && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.catalog, borderRadius: "2px" }}
                >
                  {SOURCE_STYLES.catalog.label}
                </span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--mid)" }}
              >
                {rec.description}
              </p>
            </div>
          )}

          {/* Top instructor (RMP) */}
          {rec.topInstructor && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.rmp, borderRadius: "2px" }}
                >
                  {SOURCE_STYLES.rmp.label}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--black)" }}>
                <strong>{rec.topInstructor.name}</strong>{" "}
                <span
                  style={{
                    color:
                      rec.topInstructor.rating >= 4
                        ? "#2E7D32"
                        : rec.topInstructor.rating >= 3
                          ? "#F9A825"
                          : "#C62828",
                  }}
                >
                  ★ {rec.topInstructor.rating.toFixed(1)}/5
                </span>
              </p>
            </div>
          )}

          {/* Community highlights (Reddit / RMP comments) */}
          {rec.communityHighlights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="px-1.5 py-0.5 text-[9px] font-display tracking-wider"
                  style={{ ...SOURCE_STYLES.reddit, borderRadius: "2px" }}
                >
                  COMMUNITY
                </span>
              </div>
              {rec.communityHighlights.map((h, j) => {
                const isReddit = h.source === "reddit";
                const labelColor = isReddit ? "#FF4500" : "#2E7D32";
                const label = isReddit ? "[Reddit]" : "[RMP]";
                return (
                  <p
                    key={j}
                    className="text-xs mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    <span
                      className="text-[9px] font-display"
                      style={{ color: labelColor }}
                    >
                      {label}
                    </span>{" "}
                    {isReddit && h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "underline" }}
                      >
                        &ldquo;{h.quote}&rdquo;
                      </a>
                    ) : (
                      <>&ldquo;{h.quote}&rdquo;</>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Match reasons */}
          {rec.matchReasons.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {rec.matchReasons.slice(0, 5).map((reason) => (
                <span
                  key={reason}
                  className="px-2 py-0.5 text-[10px]"
                  style={{
                    background: "color-mix(in srgb, var(--gold) 30%, white)",
                    color: "var(--black)",
                    borderRadius: "10px",
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reasoning Trace (collapsible) ───
function ReasoningTrace({
  step,
  content,
}: {
  step: "interpreter" | "recommender";
  content: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const label =
    step === "interpreter" ? "INTERPRETER THINKING" : "RECOMMENDER THINKING";

  return (
    <div
      className="border-[1.5px] my-1"
      style={{
        borderColor: "color-mix(in srgb, var(--gold) 50%, var(--beige))",
        background: "color-mix(in srgb, var(--gold) 8%, white)",
        borderRadius: "4px",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-left"
      >
        <span className="text-[13px]">🧠</span>
        <span
          className="text-[10px] font-display tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          {label}
        </span>
        <span
          className="text-[10px] ml-auto"
          style={{
            color: "var(--mid)",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          &#9656;
        </span>
      </button>
      {expanded && (
        <div
          className="px-3 pb-2 text-[11px] leading-relaxed whitespace-pre-wrap"
          style={{
            color: "var(--mid)",
            borderTop:
              "1px solid color-mix(in srgb, var(--gold) 30%, var(--beige))",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ─── Main AgentChat Component ───
export default function AgentChat({
  interests,
  semester,
  unitsFilter,
  levelFilter,
  thinking,
  intake,
  onResults,
  onBack,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [results, setResults] = useState<AgentRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when a filter (level / units / prof floor) or the ranker leaves zero
  // matches. Distinct from `error` — it renders a calm "loosen your filters"
  // empty state, not a red failure box.
  const [noResults, setNoResults] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set(),
  );
  // Phase 2.3 clarification flow — when the interpreter judges input vague,
  // the SSE emits a `clarification` event and we surface chips. The user's
  // answers get folded back into `activeInterests` and the stream re-fires.
  const [activeInterests, setActiveInterests] = useState(interests);
  const [clarification, setClarification] = useState<{
    questions: ClarifyingQuestion[];
    answers: Record<string, string[]>;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, results]);

  // Start SSE stream on mount
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    let msgId = 0;

    async function runStream() {
      try {
        const res = await fetch("/api/courses/agent-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interests: activeInterests,
            semester,
            units: unitsFilter,
            level: levelFilter,
            thinking,
            intake,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setError(formatStreamError(res.status, errData?.error));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("Streaming not supported");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload) as AgentEvent;
              const id = String(++msgId);

              switch (event.type) {
                case "thinking":
                  addMessage({ id, role: "agent", content: event.message });
                  break;
                case "reasoning":
                  addMessage({
                    id,
                    role: "reasoning",
                    content: event.content,
                    step: event.step,
                  });
                  break;
                case "interpreted":
                  addMessage({
                    id,
                    role: "agent",
                    content: formatInterpretation(event.data),
                    data: event,
                  });
                  break;
                case "researching":
                  addMessage({
                    id,
                    role: "status",
                    content: event.message,
                    source: event.source,
                  });
                  break;
                case "research_done":
                  addMessage({
                    id,
                    role: "status",
                    content: event.message,
                    source: event.source,
                    done: true,
                  });
                  break;
                case "recommending":
                  addMessage({ id, role: "agent", content: event.message });
                  break;
                case "results":
                  // Populate the VIEW only. Selection is an explicit user
                  // action — the page's selected-courses state is driven solely
                  // by the "CONTINUE WITH N SELECTED" button below, never by the
                  // stream auto-adding the top results.
                  setResults(event.data);
                  break;
                case "no_results":
                  setNoResults(event.message);
                  break;
                case "clarification": {
                  // Render chip-row follow-up and STOP this stream. The user
                  // will pick chips and we'll start a new stream with the
                  // augmented interests below.
                  const seed: Record<string, string[]> = {};
                  for (const q of event.questions) seed[q.key] = [];
                  setClarification({ questions: event.questions, answers: seed });
                  controller.abort();
                  return;
                }
                case "error":
                  setError(event.message);
                  break;
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError("Connection lost — please try again");
      }
    }

    runStream();

    return () => {
      controller.abort();
    };
    // `onResults` is intentionally NOT a dependency: the stream no longer calls
    // it. Selection flows only through the explicit Continue button.
  }, [
    activeInterests,
    semester,
    unitsFilter,
    levelFilter,
    thinking,
    intake,
    addMessage,
  ]);

  // If the parent feeds us a wholly new query (user went back and re-searched),
  // sync our local activeInterests so the stream re-fires.
  useEffect(() => {
    setActiveInterests(interests);
    setClarification(null);
    setMessages([]);
    setResults(null);
    setError(null);
    setNoResults(null);
  }, [interests]);

  function toggleChip(qKey: string, chip: string, multi?: boolean) {
    setClarification((prev) => {
      if (!prev) return prev;
      const current = prev.answers[qKey] ?? [];
      const next = multi
        ? current.includes(chip)
          ? current.filter((c) => c !== chip)
          : [...current, chip]
        : current.includes(chip)
          ? []
          : [chip];
      return { ...prev, answers: { ...prev.answers, [qKey]: next } };
    });
  }

  function submitClarification() {
    if (!clarification) return;
    const parts: string[] = [];
    for (const q of clarification.questions) {
      const picks = clarification.answers[q.key] ?? [];
      if (picks.length > 0) parts.push(`${q.label} ${picks.join(", ")}`);
    }
    if (parts.length === 0) return;
    const augmented = `${interests}. ${parts.join(". ")}`;
    setMessages([]);
    setError(null);
    setNoResults(null);
    setClarification(null);
    setActiveInterests(augmented);
  }

  function toggleCourse(id: string) {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            abortRef.current?.abort();
            onBack();
          }}
          className="font-display text-sm tracking-wider hover:underline"
          style={{ color: "var(--cardinal)" }}
        >
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[9px] font-display tracking-wider"
            style={{
              background: "var(--cardinal)",
              color: "white",
              borderRadius: "3px",
            }}
          >
            AI AGENT
          </span>
          <span className="text-xs" style={{ color: "var(--mid)" }}>
            Researching courses for you
          </span>
        </div>
      </div>

      {/* User query bubble */}
      <div className="flex justify-end mb-3">
        <div
          className="px-4 py-2.5 max-w-[80%] text-sm border-[2px]"
          style={{
            borderColor: "var(--black)",
            background: "var(--cardinal)",
            color: "white",
            borderRadius: "12px 12px 2px 12px",
          }}
        >
          {interests}
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex flex-col gap-2 mb-4 flex-1">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "reasoning" ? (
              // Thinking trace — collapsible
              <ReasoningTrace
                step={msg.step || "interpreter"}
                content={msg.content}
              />
            ) : msg.role === "status" ? (
              // Research status message
              <div className="flex items-center gap-2 py-1 px-1">
                {msg.source && SOURCE_STYLES[msg.source] && (
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-display tracking-wider flex-shrink-0"
                    style={{
                      background: SOURCE_STYLES[msg.source].bg,
                      color: SOURCE_STYLES[msg.source].color,
                      borderRadius: "2px",
                    }}
                  >
                    {SOURCE_STYLES[msg.source].label}
                  </span>
                )}
                <span
                  className="text-xs"
                  style={{ color: msg.done ? "var(--black)" : "var(--mid)" }}
                >
                  {msg.done ? "✓ " : ""}
                  {msg.content}
                </span>
              </div>
            ) : (
              // Agent message bubble
              <div className="flex justify-start">
                <div
                  className="px-4 py-2.5 max-w-[90%] text-xs leading-relaxed border-[1.5px]"
                  style={{
                    borderColor: "var(--beige)",
                    background: "white",
                    color: "var(--black)",
                    borderRadius: "2px 12px 12px 12px",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Clarification chips — shown when the interpreter judged the input
            too vague. User taps to refine, then we re-fire the stream. */}
        {clarification && (
          <div
            className="px-4 py-3 border-[2px] text-xs space-y-3"
            style={{
              borderColor: "var(--black)",
              background: "color-mix(in srgb, var(--cardinal) 6%, white)",
              borderRadius: "8px",
            }}
          >
            <div
              className="font-display text-[11px] tracking-wider"
              style={{ color: "var(--cardinal)" }}
            >
              QUICK CHECK BEFORE WE SEARCH
            </div>
            {clarification.questions.map((q) => (
              <div key={q.key} className="space-y-1.5">
                <div
                  className="text-[12px]"
                  style={{ color: "var(--black)" }}
                >
                  {q.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {q.chips.map((chip) => {
                    const selected = (
                      clarification.answers[q.key] ?? []
                    ).includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(q.key, chip, q.multi)}
                        className="px-2.5 py-1 text-[11px] border-[1.5px] transition"
                        style={{
                          borderColor: selected
                            ? "var(--cardinal)"
                            : "var(--black)",
                          background: selected
                            ? "var(--cardinal)"
                            : "white",
                          color: selected ? "white" : "var(--black)",
                          borderRadius: "16px",
                        }}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={submitClarification}
              disabled={Object.values(clarification.answers).every(
                (a) => a.length === 0,
              )}
              className="font-display text-[11px] tracking-wider px-3 py-1.5 border-[2px] disabled:opacity-40"
              style={{
                borderColor: "var(--cardinal)",
                background: "var(--cardinal)",
                color: "white",
                borderRadius: "4px",
              }}
            >
              SEARCH WITH THESE →
            </button>
          </div>
        )}

        {/* Loading indicator when no results yet and no error */}
        {!results &&
          !error &&
          !noResults &&
          !clarification &&
          messages.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-1">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--cardinal)", animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: "var(--cardinal)",
                  animationDelay: "200ms",
                }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: "var(--cardinal)",
                  animationDelay: "400ms",
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 border-[2px] text-xs"
            style={{
              borderColor: "var(--cardinal)",
              background: "color-mix(in srgb, var(--cardinal) 8%, white)",
              color: "var(--cardinal)",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {/* No matches — filters were too tight. Calm empty state (not an
            error), with a path back to loosen the constraints. */}
        {noResults && (
          <div
            className="px-4 py-4 border-[2px] text-sm flex flex-col gap-3"
            style={{
              borderColor: "var(--beige)",
              background: "color-mix(in srgb, var(--gold) 8%, white)",
              color: "var(--black)",
              borderRadius: "8px",
            }}
          >
            <div>
              <div
                className="font-display text-[11px] tracking-wider mb-1"
                style={{ color: "var(--mid)" }}
              >
                NO MATCHES
              </div>
              {noResults}
            </div>
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                onBack();
              }}
              className="self-start font-display text-[11px] tracking-wider px-3 py-1.5 border-[2px] transition-all"
              style={{
                borderColor: "var(--cardinal)",
                background: "white",
                color: "var(--cardinal)",
                borderRadius: "4px",
              }}
            >
              ← ADJUST FILTERS
            </button>
          </div>
        )}
      </div>

      {/* Results cards */}
      {results && results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3
              className="font-display text-lg tracking-wider"
              style={{ color: "var(--black)" }}
            >
              TOP {results.length} COURSES
            </h3>
            <span
              className="px-2 py-0.5 text-[9px] font-display tracking-wider"
              style={{
                background: "var(--cardinal)",
                color: "white",
                borderRadius: "3px",
              }}
            >
              AI
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--mid)" }}>
            Tap a card to expand AI reasoning and source citations.
          </p>

          <div className="flex flex-col gap-3 mb-4">
            {results.map((rec, i) => {
              // For section-level recs (GESM/WRIT), use sectionId to distinguish
              const courseId = rec.sectionId
                ? `${rec.department}-${rec.number}@${rec.sectionId}`
                : `${rec.department}-${rec.number}`;
              return (
                <CourseCard
                  key={`${courseId}-${i}`}
                  rec={rec}
                  onAdd={() => toggleCourse(courseId)}
                  isAdded={selectedCourses.has(courseId)}
                  canAdd={selectedCourses.size < 6}
                />
              );
            })}
          </div>

          {/* Action: pass selected courses back */}
          {selectedCourses.size > 0 && (
            <button
              onClick={() => {
                if (results) {
                  const selected = results.filter((r) => {
                    const id = r.sectionId
                      ? `${r.department}-${r.number}@${r.sectionId}`
                      : `${r.department}-${r.number}`;
                    return selectedCourses.has(id);
                  });
                  if (selected.length > 0) onResults(selected);
                }
                onBack();
              }}
              className="w-full py-4 font-display text-lg tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
              style={{
                background: "var(--cardinal)",
                boxShadow: "4px 4px 0 var(--black)",
              }}
            >
              CONTINUE WITH {selectedCourses.size} SELECTED →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───
function formatInterpretation(data: {
  interests: string[];
  preferences: string[];
  dealbreakers: string[];
  departments: string[];
  geCategories: string[];
}): string {
  const parts: string[] = [];

  if (data.interests.length > 0) {
    parts.push(`Interests: ${data.interests.join(", ")}`);
  }
  if (data.preferences.length > 0) {
    parts.push(`Looking for: ${data.preferences.join(", ")}`);
  }
  if (data.dealbreakers.length > 0) {
    parts.push(`Avoiding: ${data.dealbreakers.join(", ")}`);
  }
  if (data.departments.length > 0) {
    parts.push(`Departments: ${data.departments.join(", ")}`);
  }
  if (data.geCategories.length > 0) {
    parts.push(`GE categories: ${data.geCategories.join(", ")}`);
  }

  return parts.length > 0
    ? `Got it! Here's what I understood:\n${parts.join("\n")}`
    : "Understood your request. Searching now...";
}

/** Map HTTP status → user-facing message. The previous one-size-fits-all
 *  "Failed to start AI search" told users nothing actionable — 401 looks the
 *  same as 503 looks the same as a network timeout. This branching gives the
 *  user a hint about whether to retry, fix their input, or ping support. */
function formatStreamError(status: number, fallback?: string): string {
  if (status === 400) {
    return (
      fallback ||
      "Your request looks off — try describing topics or courses you're interested in."
    );
  }
  if (status === 401 || status === 403) {
    return "You need to sign in to use the AI course planner.";
  }
  if (status === 429) {
    return "Too many AI searches in a short window — give it a minute and try again.";
  }
  if (status === 503) {
    return "The AI search isn't configured or is temporarily unavailable. Try again in a bit.";
  }
  if (status >= 500) {
    return "Our agent hit a glitch on the way to USC's catalog. Refresh and try again.";
  }
  return fallback || `Couldn't start the AI search (HTTP ${status}).`;
}
