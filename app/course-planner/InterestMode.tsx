"use client";

import type { RecommendedCourse } from "@/lib/course-planner/recommender";
import type { AgentRecommendation } from "@/lib/course-planner/agent";

interface InterestModeProps {
  recommendations: RecommendedCourse[];
  agentResults: AgentRecommendation[];
  recMode: string;
  agentFailed: boolean;
  selectedCourses: { id: string; label: string }[];
  onAddCourse: (id: string, label: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function InterestMode({
  recommendations,
  agentResults,
  recMode,
  agentFailed,
  selectedCourses,
  onAddCourse,
  onBack,
  onContinue,
}: InterestModeProps) {
  return (
    <div>
      <button
        onClick={onBack}
        className="font-display text-sm tracking-wider mb-4 hover:underline"
        style={{ color: "var(--cardinal)" }}
      >
        ← BACK TO INTERESTS
      </button>

      <div className="flex items-center gap-2 mb-1">
        <h2
          className="font-display text-xl tracking-wider"
          style={{ color: "var(--black)" }}
        >
          WE FOUND {recommendations.length} COURSES FOR YOU
        </h2>
        {recMode === "agent" && (
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
        )}
      </div>
      <p className="text-xs mb-2" style={{ color: "var(--mid)" }}>
        {recMode === "agent"
          ? "AI-powered recommendations based on RMP ratings, Reddit discussions, and course data."
          : "Ranked by relevance to your interests. Click + to add courses to your schedule."}
      </p>
      {agentFailed && recMode === "free" && (
        <p
          className="text-[11px] px-3 py-2 mb-4 border-[1.5px]"
          style={{
            borderColor: "var(--gold)",
            background: "color-mix(in srgb, var(--gold) 10%, white)",
            color: "var(--mid)",
            borderRadius: "4px",
          }}
        >
          AI search is temporarily unavailable — showing keyword-matched results
          instead. For better recommendations with professor ratings and student
          reviews, try again later.
        </p>
      )}

      <div className="flex flex-col gap-3 mb-6">
        {(() => {
          const selectedSet = new Set(selectedCourses.map((c) => c.id));
          const agentMap = new Map(
            agentResults.map((a) => [`${a.department}-${a.number}`, a]),
          );
          return recommendations.map((rec, i) => {
            const courseId = `${rec.department}-${rec.number}`;
            const courseLabel = `${rec.department} ${rec.number} — ${rec.title}`;
            const isAdded = selectedSet.has(courseId);
            const agentData = agentMap.get(courseId);

            return (
              <div
                key={`${courseId}-${i}`}
                className="p-4 border-[2px]"
                style={{
                  borderColor: isAdded ? "var(--cardinal)" : "var(--beige)",
                  background: isAdded
                    ? "color-mix(in srgb, var(--cardinal) 4%, white)"
                    : "white",
                  borderRadius: "4px",
                }}
              >
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Course code + tags */}
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
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--mid)" }}
                        >
                          {rec.units} units
                        </span>
                      )}
                      {agentData && (
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
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className="text-sm mb-1"
                      style={{ color: "var(--black)" }}
                    >
                      {rec.title}
                    </p>

                    {/* Description (always show, truncated) */}
                    {rec.description && (
                      <p
                        className="text-xs mb-2 line-clamp-2"
                        style={{ color: "var(--mid)" }}
                      >
                        {rec.description}
                      </p>
                    )}
                  </div>

                  {/* Add button */}
                  <div className="flex-shrink-0 flex items-start">
                    <button
                      onClick={() => onAddCourse(courseId, courseLabel)}
                      disabled={isAdded || selectedCourses.length >= 6}
                      className="px-3 py-2 text-xs font-display tracking-wider border-[2px] transition-all"
                      style={{
                        borderColor: isAdded
                          ? "var(--cardinal)"
                          : "var(--black)",
                        background: isAdded ? "var(--cardinal)" : "white",
                        color: isAdded ? "white" : "var(--black)",
                        borderRadius: "4px",
                        opacity:
                          isAdded || selectedCourses.length >= 6 ? 0.6 : 1,
                      }}
                    >
                      {isAdded ? "ADDED" : "+ ADD"}
                    </button>
                  </div>
                </div>

                {/* Agent rationale section */}
                {agentData && (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: "1px solid var(--beige)" }}
                  >
                    {/* AI Reasoning */}
                    {agentData.aiReasoning && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 mb-1">
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
                          {agentData.aiReasoning}
                        </p>
                      </div>
                    )}

                    {/* Sources grid */}
                    <div className="flex flex-col gap-1.5">
                      {/* RMP source */}
                      {agentData.topInstructor && (
                        <div className="flex items-start gap-1.5">
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-display tracking-wider flex-shrink-0 mt-px"
                            style={{
                              background:
                                "color-mix(in srgb, #2E7D32 12%, white)",
                              color: "#2E7D32",
                              borderRadius: "2px",
                            }}
                          >
                            RMP
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--black)" }}
                          >
                            <strong>{agentData.topInstructor.name}</strong>{" "}
                            <span
                              style={{
                                color:
                                  agentData.topInstructor.rating >= 4
                                    ? "#2E7D32"
                                    : agentData.topInstructor.rating >= 3
                                      ? "#F9A825"
                                      : "#C62828",
                              }}
                            >
                              ★ {agentData.topInstructor.rating.toFixed(1)}
                              /5
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Community highlights with source labels */}
                      {agentData.communityHighlights.slice(0, 3).map((h, j) => {
                        const isRMP =
                          h.startsWith("Best prof:") ||
                          h.toLowerCase().includes("rmp");
                        const isReddit =
                          h.toLowerCase().includes("reddit") ||
                          h.startsWith("r/");
                        const sourceLabel = isRMP
                          ? "RMP"
                          : isReddit
                            ? "REDDIT"
                            : "COMMUNITY";
                        const sourceColor = isRMP
                          ? "#2E7D32"
                          : isReddit
                            ? "#FF4500"
                            : "var(--mid)";
                        // Strip redundant "Reddit:" or "RMP:" prefix from the text itself
                        const cleanText = h
                          .replace(/^(Reddit|RMP|r\/USC):\s*/i, "")
                          .trim();

                        return (
                          <div key={j} className="flex items-start gap-1.5">
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-display tracking-wider flex-shrink-0 mt-px"
                              style={{
                                background: `color-mix(in srgb, ${sourceColor} 12%, white)`,
                                color: sourceColor,
                                borderRadius: "2px",
                              }}
                            >
                              {sourceLabel}
                            </span>
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--mid)" }}
                            >
                              &ldquo;{cleanText}&rdquo;
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Match reasons */}
                    {rec.matchReasons.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {rec.matchReasons.slice(0, 4).map((reason) => (
                          <span
                            key={reason}
                            className="px-2 py-0.5 text-[10px]"
                            style={{
                              background:
                                "color-mix(in srgb, var(--gold) 30%, white)",
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

                {/* Non-agent mode: match reasons only */}
                {!agentData && rec.matchReasons.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--mid)" }}
                    >
                      Matches:
                    </span>
                    {rec.matchReasons.slice(0, 4).map((reason) => (
                      <span
                        key={reason}
                        className="px-2 py-0.5 text-[10px]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--gold) 30%, white)",
                          color: "var(--black)",
                          borderRadius: "10px",
                        }}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Section topics (both modes) */}
                {rec.sectionTopics && rec.sectionTopics.length > 1 && (
                  <div className="mt-1.5">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--mid)" }}
                    >
                      Topics:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {rec.sectionTopics.slice(0, 6).map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-0.5 text-[10px]"
                          style={{
                            background:
                              "color-mix(in srgb, var(--cardinal) 10%, white)",
                            color: "var(--cardinal)",
                            borderRadius: "10px",
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                      {rec.sectionTopics.length > 6 && (
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--mid)" }}
                        >
                          +{rec.sectionTopics.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Selected count + continue */}
      {selectedCourses.length > 0 && (
        <button
          onClick={onContinue}
          className="w-full py-4 font-display text-lg tracking-wider text-white border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
          style={{
            background: "var(--cardinal)",
            boxShadow: "4px 4px 0 var(--black)",
          }}
        >
          CONTINUE WITH {selectedCourses.length} SELECTED →
        </button>
      )}
    </div>
  );
}
