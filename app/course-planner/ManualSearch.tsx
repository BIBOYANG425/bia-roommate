"use client";

import SemesterSelector from "@/components/course-planner/SemesterSelector";
import CourseSearch from "@/components/course-planner/CourseSearch";
import GEGrid from "@/components/course-planner/GEGrid";
import SelectedList from "@/components/course-planner/SelectedList";
import SchedulePreferences from "@/components/course-planner/SchedulePreferences";
import InterestInput from "@/components/course-planner/InterestInput";
import type { SchedulePrefs } from "./page";
import type { RecommendedCourse } from "@/lib/course-planner/recommender";
import type { AgentRecommendation } from "@/lib/course-planner/agent";

type ManualInterestMode = "manual" | "interest";

interface ManualSearchProps {
  mode: ManualInterestMode;
  onModeChange: (mode: ManualInterestMode) => void;
  semester: string;
  selectedCourses: { id: string; label: string }[];
  prefs: SchedulePrefs;
  onPrefsChange: (prefs: SchedulePrefs) => void;
  onAddCourse: (id: string, label: string) => void;
  onRemoveCourse: (id: string) => void;
  onBuild: () => void;
  onRecommendations: (
    results: RecommendedCourse[],
    agentRecs?: AgentRecommendation[],
    mode?: string,
    didAgentFail?: boolean,
  ) => void;
  onAgentSearch: (
    interests: string,
    units: string | null,
    thinking: boolean,
    level: string | null,
  ) => void;
}

export default function ManualSearch({
  mode,
  onModeChange,
  semester,
  selectedCourses,
  prefs,
  onPrefsChange,
  onAddCourse,
  onRemoveCourse,
  onBuild,
  onRecommendations,
  onAgentSearch,
}: ManualSearchProps) {
  return (
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
          onClick={() => onModeChange("manual")}
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
          onClick={() => onModeChange("interest")}
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
            <CourseSearch onSelect={onAddCourse} semester={semester} />
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
            semester={semester}
            onResults={onRecommendations}
            onAgentSearch={onAgentSearch}
          />
        </div>
      )}

      {/* Selected courses */}
      {selectedCourses.length > 0 && (
        <SelectedList
          courses={selectedCourses}
          maxCourses={6}
          onRemove={onRemoveCourse}
        />
      )}

      {/* Schedule Preferences */}
      {selectedCourses.length > 0 && (
        <SchedulePreferences prefs={prefs} onChange={onPrefsChange} />
      )}

      {/* Build button */}
      {selectedCourses.length > 0 && (
        <button
          onClick={onBuild}
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
          onSelect={onAddCourse}
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
        Results are ranked by Rate My Professors ratings, so sections without a
        rated professor or with no professor yet assigned may not appear. Use
        this tool as a starting point and always verify your schedule on the{" "}
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
  );
}
