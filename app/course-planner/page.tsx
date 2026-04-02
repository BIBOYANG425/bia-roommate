"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavTabs from "@/components/NavTabs";
import SemesterSelector from "@/components/course-planner/SemesterSelector";
import CourseSearch from "@/components/course-planner/CourseSearch";
import GEGrid from "@/components/course-planner/GEGrid";
import SelectedList from "@/components/course-planner/SelectedList";
import SchedulePreferences from "@/components/course-planner/SchedulePreferences";
import ResultsView from "@/components/course-planner/ResultsView";
import SavedScheduleView from "@/components/course-planner/SavedScheduleView";
import InterestInput from "@/components/course-planner/InterestInput";
import AgentChat from "@/components/course-planner/AgentChat";
import OnboardingTour from "@/components/course-planner/OnboardingTour";
import { ScheduleProvider, usePlanner } from "@/lib/course-planner/store";
import Toast from "@/components/Toast";
import type { RecommendedCourse } from "@/lib/course-planner/recommender";
import type { AgentRecommendation } from "@/lib/course-planner/agent";

export interface SchedulePrefs {
  earliestClass: string;
  doneBy: string;
  preferBackToBack: boolean;
  hideDClearance: boolean;
  hideGraduate: boolean;
  hideThematicOption: boolean;
}

type Mode = "manual" | "interest" | "agentChat" | "recommendations" | "results";

function PlannerContent() {
  const { state, dispatch } = usePlanner();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedCourses, setSelectedCourses] = useState<
    { id: string; label: string }[]
  >([]);
  const [prefs, setPrefs] = useState<SchedulePrefs>({
    earliestClass: "",
    doneBy: "",
    preferBackToBack: false,
    hideDClearance: false,
    hideGraduate: false,
    hideThematicOption: false,
  });
  const [mode, setMode] = useState<Mode>("manual");
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>(
    [],
  );
  const [agentResults, setAgentResults] = useState<AgentRecommendation[]>([]);
  const [recMode, setRecMode] = useState<string>("free");
  const [agentFailed, setAgentFailed] = useState(false);
  const [agentQuery, setAgentQuery] = useState<{
    interests: string;
    units: string | null;
    thinking: boolean;
  } | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Saved schedule viewing
  const scheduleId = searchParams.get("schedule");
  const [savedSchedule, setSavedSchedule] = useState<{
    name: string;
    semester: string;
    schedule_data: { sections: any[]; avgRating: number };
  } | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);

  useEffect(() => {
    if (!scheduleId) {
      setSavedSchedule(null);
      return;
    }
    setSavedLoading(true);
    fetch(`/api/schedules?id=${scheduleId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setSavedSchedule(data);
        setSavedLoading(false);
      })
      .catch(() => {
        setSavedSchedule(null);
        setSavedLoading(false);
        router.replace("/course-planner");
      });
  }, [scheduleId, router]);

  useEffect(() => {
    const seen = localStorage.getItem("bia-tour-seen");
    if (!seen) setShowTour(true);
  }, []);

  const addCourse = useCallback(
    (id: string, label: string) => {
      setSelectedCourses((prev) => {
        if (prev.length >= 6) return prev;
        if (prev.some((c) => c.id === id)) return prev;
        return [...prev, { id, label }];
      });
      if (mode === "results") setMode("manual");
    },
    [mode],
  );

  const removeCourse = useCallback(
    (id: string) => {
      setSelectedCourses((prev) => prev.filter((c) => c.id !== id));
      if (mode === "results") setMode("manual");
    },
    [mode],
  );

  const handleBuild = useCallback(() => {
    if (selectedCourses.length === 0) return;
    setMode("results");
  }, [selectedCourses]);

  const handleRecommendations = useCallback(
    (
      results: RecommendedCourse[],
      agentRecs?: AgentRecommendation[],
      mode?: string,
      didAgentFail?: boolean,
    ) => {
      setRecommendations(results);
      setAgentResults(agentRecs || []);
      setRecMode(mode || "free");
      setAgentFailed(!!didAgentFail);
      setMode("recommendations");
    },
    [],
  );

  const handleAgentSearch = useCallback(
    (interests: string, units: string | null, thinking: boolean) => {
      setAgentQuery({ interests, units, thinking });
      setMode("agentChat");
    },
    [],
  );

  const handleAgentResults = useCallback((results: AgentRecommendation[]) => {
    setAgentResults(results);
    // Convert to selectedCourses with section-pinned IDs for GESM/WRIT
    const newSelected = results.map((r) => {
      const id = r.sectionId
        ? `${r.department}-${r.number}@${r.sectionId}`
        : `${r.department}-${r.number}`;
      const label = r.sectionId
        ? `${r.department} ${r.number} — ${r.sectionTopic || r.title}`
        : `${r.department} ${r.number} — ${r.title}`;
      return { id, label };
    });
    setSelectedCourses(newSelected.slice(0, 6));
    setRecommendations(
      results.map((r) => ({
        department: r.department,
        number: r.number,
        title: r.title,
        units: r.units,
        description: r.description,
        relevanceScore: r.relevanceScore,
        matchReasons: r.matchReasons,
        geTag: r.geTag,
        sectionTopics: r.sectionTopics,
      })),
    );
    setRecMode("agent");
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <NavTabs />

      {showTour && (
        <OnboardingTour
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem("bia-tour-seen", "1");
          }}
        />
      )}

      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)] px-6 py-5"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">
            BIA 选课
          </h1>
          <p className="text-sm text-white/60">
            USC COURSE PLANNER — FIND YOUR BEST SCHEDULE
          </p>
          <button
            onClick={() => setShowTour(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-1 font-display text-[11px] tracking-wider border-[2px] border-white/40 text-white/70 hover:text-white hover:border-white transition-all"
            style={{ borderRadius: 4 }}
          >
            TOUR
          </button>
        </div>
      </div>

      {state.error && (
        <Toast
          message={state.error}
          onClose={() => dispatch({ type: "SET_ERROR", error: null })}
        />
      )}

      <div className="max-w-3xl mx-auto px-6 py-8">
        {scheduleId ? (
          savedLoading ? (
            <div className="text-center py-20">
              <p
                className="font-display text-xl"
                style={{ color: "var(--mid)" }}
              >
                LOADING SCHEDULE...
              </p>
            </div>
          ) : savedSchedule ? (
            <SavedScheduleView
              name={savedSchedule.name}
              semester={savedSchedule.semester}
              sections={savedSchedule.schedule_data.sections}
              avgRating={savedSchedule.schedule_data.avgRating}
              onBack={() => router.push("/account")}
            />
          ) : null
        ) : mode === "results" ? (
          <ResultsView
            courses={selectedCourses}
            semester={state.semester}
            prefs={prefs}
            onBack={() => setMode("manual")}
          />
        ) : mode === "agentChat" && agentQuery ? (
          <AgentChat
            interests={agentQuery.interests}
            semester={state.semester}
            unitsFilter={agentQuery.units}
            thinking={agentQuery.thinking}
            onResults={handleAgentResults}
            onBack={() => setMode("interest")}
          />
        ) : mode === "recommendations" ? (
          /* ── Recommendation Results ── */
          <div>
            <button
              onClick={() => setMode("interest")}
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
                AI search is temporarily unavailable — showing keyword-matched
                results instead. For better recommendations with professor
                ratings and student reviews, try again later.
              </p>
            )}

            <div className="flex flex-col gap-3 mb-6">
              {recommendations.map((rec, i) => {
                const courseId = `${rec.department}-${rec.number}`;
                const courseLabel = `${rec.department} ${rec.number} — ${rec.title}`;
                const isAdded = selectedCourses.some((c) => c.id === courseId);
                const agentData = agentResults.find(
                  (a) =>
                    a.department === rec.department && a.number === rec.number,
                );

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
                          onClick={() => addCourse(courseId, courseLabel)}
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
                          {agentData.communityHighlights
                            .slice(0, 3)
                            .map((h, j) => {
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
                                <div
                                  key={j}
                                  className="flex items-start gap-1.5"
                                >
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
                        <span className="text-[10px]" style={{ color: "var(--mid)" }}>
                          Topics:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {rec.sectionTopics.slice(0, 6).map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-0.5 text-[10px]"
                              style={{
                                background: "color-mix(in srgb, var(--cardinal) 10%, white)",
                                color: "var(--cardinal)",
                                borderRadius: "10px",
                              }}
                            >
                              {topic}
                            </span>
                          ))}
                          {rec.sectionTopics.length > 6 && (
                            <span className="text-[10px]" style={{ color: "var(--mid)" }}>
                              +{rec.sectionTopics.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected count + continue */}
            {selectedCourses.length > 0 && (
              <button
                onClick={() => setMode("manual")}
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
        ) : (
          /* ── Manual / Interest Mode ── */
          <>
            {/* Semester */}
            <div className="mb-6">
              <label
                className="font-display text-sm tracking-wider mb-2 block"
                style={{ color: "var(--cardinal)" }}
              >
                SEMESTER
              </label>
              <div className="w-52">
                <SemesterSelector />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode("manual")}
                className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
                style={{
                  borderColor: "var(--black)",
                  background: mode === "manual" ? "var(--cardinal)" : "white",
                  color: mode === "manual" ? "white" : "var(--black)",
                  borderRadius: "20px",
                }}
              >
                SEARCH COURSES
              </button>
              <button
                onClick={() => setMode("interest")}
                className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
                style={{
                  borderColor: "var(--black)",
                  background: mode === "interest" ? "var(--cardinal)" : "white",
                  color: mode === "interest" ? "white" : "var(--black)",
                  borderRadius: "20px",
                }}
              >
                DISCOVER BY INTEREST
              </button>
            </div>

            {mode === "manual" ? (
              <>
                {/* Course Search */}
                <div className="mb-6">
                  <label
                    className="font-display text-sm tracking-wider mb-2 block"
                    style={{ color: "var(--cardinal)" }}
                  >
                    ADD COURSES OR GE REQUIREMENTS
                  </label>
                  <CourseSearch
                    onSelect={addCourse}
                    semester={state.semester}
                  />
                </div>
              </>
            ) : (
              /* Interest Input */
              <div className="mb-6">
                <label
                  className="font-display text-sm tracking-wider mb-2 block"
                  style={{ color: "var(--cardinal)" }}
                >
                  DESCRIBE YOUR INTERESTS
                </label>
                <InterestInput
                  semester={state.semester}
                  onResults={handleRecommendations}
                  onAgentSearch={handleAgentSearch}
                />
              </div>
            )}

            {/* Selected courses */}
            {selectedCourses.length > 0 && (
              <SelectedList
                courses={selectedCourses}
                maxCourses={6}
                onRemove={removeCourse}
              />
            )}

            {/* Schedule Preferences */}
            {selectedCourses.length > 0 && (
              <SchedulePreferences prefs={prefs} onChange={setPrefs} />
            )}

            {/* Build button */}
            {selectedCourses.length > 0 && (
              <button
                onClick={handleBuild}
                className="w-full py-4 font-display text-xl tracking-wider text-white border-[3px] border-[var(--black)] mt-6 transition-all hover:translate-y-[-2px]"
                style={{
                  background: "var(--cardinal)",
                  boxShadow: "4px 4px 0 var(--black)",
                }}
              >
                BUILD BEST SCHEDULE →
              </button>
            )}

            {/* GE Categories (manual mode only) */}
            {mode === "manual" && (
              <GEGrid
                onSelect={addCourse}
                selectedIds={selectedCourses.map((c) => c.id)}
              />
            )}

            {/* Disclaimer */}
            <div
              className="mt-8 p-4 border-[2px] text-xs leading-relaxed"
              style={{
                borderColor: "var(--gold)",
                background: "color-mix(in srgb, var(--gold) 10%, white)",
                color: "var(--mid)",
              }}
            >
              Results are ranked by Rate My Professors ratings, so sections
              without a rated professor or with no professor yet assigned may
              not appear. Use this tool as a starting point and always verify
              your schedule on the{" "}
              <a
                href="https://classes.usc.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--cardinal)" }}
              >
                USC Schedule of Classes
              </a>
              .
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          BIA 选课 — USC COURSE PLANNER
        </p>
      </footer>
    </main>
  );
}

export default function CoursePlannerPage() {
  return (
    <Suspense>
      <ScheduleProvider>
        <PlannerContent />
      </ScheduleProvider>
    </Suspense>
  );
}
