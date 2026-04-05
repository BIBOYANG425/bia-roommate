"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ResultsView from "@/components/course-planner/ResultsView";
import SavedScheduleView from "@/components/course-planner/SavedScheduleView";
import { ScheduleProvider, usePlanner } from "@/lib/course-planner/store";
import type { RecommendedCourse } from "@/lib/course-planner/recommender";
import type { AgentRecommendation } from "@/lib/course-planner/agent";
import PlannerHeader from "./PlannerHeader";
import ManualSearch from "./ManualSearch";
import InterestMode from "./InterestMode";
import AgentChat from "@/components/course-planner/AgentChat";

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
    level: string | null;
  } | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Saved schedule viewing
  const scheduleId = searchParams.get("schedule");
  const [savedSchedule, setSavedSchedule] = useState<{
    name: string;
    semester: string;
    schedule_data: { sections: unknown[]; avgRating: number };
  } | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);

  useEffect(() => {
    if (!scheduleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting state when param removed
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing from localStorage on mount
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
    (
      interests: string,
      units: string | null,
      thinking: boolean,
      level: string | null,
    ) => {
      setAgentQuery({ interests, units, thinking, level });
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
      <PlannerHeader
        showTour={showTour}
        onTourComplete={() => {
          setShowTour(false);
          localStorage.setItem("bia-tour-seen", "1");
        }}
        onTourOpen={() => setShowTour(true)}
        error={state.error}
        onDismissError={() => dispatch({ type: "SET_ERROR", error: null })}
      />

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
            levelFilter={agentQuery.level}
            thinking={agentQuery.thinking}
            onResults={handleAgentResults}
            onBack={() => setMode("interest")}
          />
        ) : mode === "recommendations" ? (
          <InterestMode
            recommendations={recommendations}
            agentResults={agentResults}
            recMode={recMode}
            agentFailed={agentFailed}
            selectedCourses={selectedCourses}
            onAddCourse={addCourse}
            onBack={() => setMode("interest")}
            onContinue={() => setMode("manual")}
          />
        ) : (
          <ManualSearch
            mode={mode as "manual" | "interest"}
            onModeChange={(m) => setMode(m)}
            semester={state.semester}
            selectedCourses={selectedCourses}
            prefs={prefs}
            onPrefsChange={setPrefs}
            onAddCourse={addCourse}
            onRemoveCourse={removeCourse}
            onBuild={handleBuild}
            onRecommendations={handleRecommendations}
            onAgentSearch={handleAgentSearch}
          />
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
