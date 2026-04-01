"use client";

import { useState, useEffect, useCallback } from "react";
import type { SchedulePrefs } from "@/app/course-planner/page";
import type { Course, Section, RmpRating } from "@/lib/course-planner/types";
import { parseSectionTimes, formatTime } from "@/lib/course-planner/conflicts";
import { COURSE_COLORS } from "@/lib/course-planner/colors";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import ResultCalendar from "./ResultCalendar";

// Convert USC dayCode (e.g. "TH", "MWF") to display format ("TTh", "MWF")
function formatDaysShort(dayCode: string): string {
  if (!dayCode || dayCode.toUpperCase() === "TBA") return "TBA";
  const map: Record<string, string> = {
    M: "M",
    T: "T",
    W: "W",
    H: "Th",
    F: "F",
  };
  return dayCode
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

interface ScheduleSection {
  course: Course;
  section: Section;
  colorIndex: number;
  geTag?: string; // e.g. "GE-A" if this course fulfills a GE
}

interface GeneratedSchedule {
  sections: ScheduleSection[];
  avgRating: number;
}

interface ResultsViewProps {
  courses: { id: string; label: string }[];
  semester: string;
  prefs: SchedulePrefs;
  onBack: () => void;
}

export default function ResultsView({
  courses,
  semester,
  prefs,
  onBack,
}: ResultsViewProps) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<GeneratedSchedule[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [rmpData, setRmpData] = useState<Record<string, RmpRating | null>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "naming" | "saving" | "saved" | "error"
  >("idle");
  const [scheduleName, setScheduleName] = useState("");

  const buildSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(5);

    try {
      // 1. Fetch all courses from USC API
      const courseData: Course[] = [];
      // Track which courses belong to which selection (for GE grouping)
      const selectionMap: Record<string, Course[]> = {};

      for (const c of courses) {
        const isGE = c.id.startsWith("GE-");
        selectionMap[c.id] = [];

        try {
          if (isGE) {
            // Fetch GE courses with sections from dedicated endpoint
            const res = await fetch(
              `/api/courses/ge?category=${encodeURIComponent(c.id)}&semester=${semester}`,
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                for (const course of data) {
                  if (course.sections?.length > 0) {
                    courseData.push(course);
                    selectionMap[c.id].push(course);
                  }
                }
              }
            }
          } else {
            // Regular course: split "CSCI-201" → dept=CSCI, num=201
            const parts = c.id.split("-");
            const res = await fetch(
              `/api/courses/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}?semester=${semester}`,
            );
            if (res.ok) {
              const data = await res.json();
              if (data.sections?.length > 0) {
                courseData.push(data);
                selectionMap[c.id].push(data);
              }
            }
          }
        } catch {
          /* skip failed fetch */
        }

        setProgress((prev) =>
          Math.min(prev + Math.round(40 / courses.length), 45),
        );
      }

      if (courseData.length === 0) {
        setError("NO COURSE DATA FOUND FOR THIS SEMESTER");
        setLoading(false);
        return;
      }

      setProgress(50);

      // 2. Fetch RMP ratings for all instructors
      const rmpCache: Record<string, RmpRating | null> = {};
      const instructorNames = new Set<string>();
      for (const course of courseData) {
        for (const sec of course.sections || []) {
          if (sec.instructor?.lastName) {
            instructorNames.add(
              `${sec.instructor.firstName} ${sec.instructor.lastName}`,
            );
          }
        }
      }

      const rmpBatch = [...instructorNames].slice(0, 50); // limit to avoid rate limiting
      await Promise.all(
        rmpBatch.map(async (name) => {
          try {
            const res = await fetch(
              `/api/rmp/search?name=${encodeURIComponent(name)}`,
            );
            const data = await res.json();
            const parts = name.split(" ");
            const key = `${parts.slice(1).join(" ")}, ${parts[0]}`;
            rmpCache[key] = data;
          } catch {
            /* ignore */
          }
        }),
      );

      setRmpData({ ...rmpCache });
      setProgress(70);

      // 3. Generate schedule combinations using backtracking
      const getRating = (sec: Section): number => {
        const key = `${sec.instructor?.lastName}, ${sec.instructor?.firstName}`;
        return rmpCache[key]?.avgRating ?? 2.5;
      };

      // Parse time preference filters
      const earliestMin = prefs.earliestClass
        ? parseInt(prefs.earliestClass.split(":")[0]) * 60
        : 0;
      const doneByMin = prefs.doneBy
        ? parseInt(prefs.doneBy.split(":")[0]) * 60
        : 24 * 60;

      // Group courses by the original selection
      const courseGroups: {
        label: string;
        isGE: boolean;
        geTag?: string;
        options: { course: Course; sections: Section[] }[];
      }[] = [];

      for (const sel of courses) {
        const matching = selectionMap[sel.id] || [];
        if (matching.length > 0) {
          const isGE = sel.id.startsWith("GE-");
          courseGroups.push({
            label: sel.label,
            isGE,
            geTag: isGE ? sel.id : undefined,
            options: matching
              .map((c) => {
                // Keep lecture-type sections (Lecture, Lecture/Discussion, Lecture-Lab, etc.)
                // Fall back to all sections if no lecture types found
                const allActive = (c.sections || []).filter(
                  (s) =>
                    !s.isCancelled &&
                    s.times.some((t) => t.start_time && t.day !== "TBA"),
                );
                const lectureTypes = allActive.filter((s) =>
                  s.type.toLowerCase().includes("lecture"),
                );
                return {
                  course: c,
                  sections: lectureTypes.length > 0 ? lectureTypes : allActive,
                };
              })
              .filter((opt) => opt.sections.length > 0),
          });
        }
      }

      // Pre-sort GE options: for each GE group, sort courses by best section rating
      // so the backtracking tries the most promising courses first
      for (const group of courseGroups) {
        if (group.isGE && group.options.length > 1) {
          group.options.sort((a, b) => {
            const bestA = Math.max(...a.sections.map((s) => getRating(s)), 0);
            const bestB = Math.max(...b.sections.map((s) => getRating(s)), 0);
            return bestB - bestA;
          });
        }
      }

      // Generate top schedules via backtracking
      const results: GeneratedSchedule[] = [];
      const maxResults = 5;
      const timeout = Date.now() + 25000;

      function backtrack(
        groupIdx: number,
        selected: ScheduleSection[],
        totalRating: number,
        usedSlots: { day: string; startMin: number; endMin: number }[],
      ) {
        if (Date.now() > timeout) return;
        if (results.length >= maxResults * 10) return; // enough candidates

        if (groupIdx >= courseGroups.length) {
          const avg = selected.length > 0 ? totalRating / selected.length : 0;
          results.push({
            sections: [...selected],
            avgRating: Math.round(avg * 100) / 100,
          });
          return;
        }

        const group = courseGroups[groupIdx];
        // For GE groups: try top 10 courses. For regular courses: try all (usually 1).
        const optionsToTry = group.isGE
          ? group.options.slice(0, 10)
          : group.options;

        for (const opt of optionsToTry) {
          // Sort sections by rating
          const sorted = [...opt.sections].sort(
            (a, b) => getRating(b) - getRating(a),
          );

          for (const sec of sorted.slice(0, 6)) {
            const slots = parseSectionTimes(sec.times);
            // Skip sections with no actual time slots (TBA/online)
            if (slots.length === 0) continue;

            // Check time preferences
            const meetsPrefs = slots.every(
              (s) => s.startMin >= earliestMin && s.endMin <= doneByMin,
            );
            if (!meetsPrefs && (prefs.earliestClass || prefs.doneBy)) continue;

            // Check conflicts
            const hasConflict = slots.some((newSlot) =>
              usedSlots.some(
                (existing) =>
                  existing.day === newSlot.day &&
                  existing.startMin < newSlot.endMin &&
                  newSlot.startMin < existing.endMin,
              ),
            );
            if (hasConflict) continue;

            selected.push({
              course: opt.course,
              section: sec,
              colorIndex: groupIdx % COURSE_COLORS.length,
              geTag: group.geTag,
            });
            const newSlots = [...usedSlots, ...slots];

            backtrack(
              groupIdx + 1,
              selected,
              totalRating + getRating(sec),
              newSlots,
            );

            selected.pop();

            // If we already have enough results, stop exploring this group
            if (results.length >= maxResults * 10) return;
          }
        }
      }

      backtrack(0, [], 0, []);

      setProgress(95);

      // Sort by average rating and take top 5
      results.sort((a, b) => b.avgRating - a.avgRating);
      const top = results.slice(0, maxResults);

      if (top.length === 0) {
        setError("NO VALID SCHEDULE FOUND — TRY ADJUSTING PREFERENCES");
      }

      setSchedules(top);
      setActiveIdx(0);
    } catch (e) {
      setError("FAILED TO BUILD SCHEDULES");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [courses, semester, prefs]);

  useEffect(() => {
    buildSchedules();
  }, [buildSchedules]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <h2
          className="font-display text-2xl mb-4"
          style={{ color: "var(--black)" }}
        >
          BUILDING YOUR BEST SCHEDULE...
        </h2>
        <div
          className="w-full max-w-md mx-auto h-3 border-[2px] border-[var(--black)]"
          style={{ background: "var(--cream)" }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--cardinal)" }}
          />
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--mid)" }}>
          Fetching courses, ratings, and finding the optimal combination...
        </p>
      </div>
    );
  }

  if (error && schedules.length === 0) {
    return (
      <div className="text-center py-20">
        <p
          className="font-display text-xl mb-4"
          style={{ color: "var(--cardinal)" }}
        >
          {error}
        </p>
        <button onClick={onBack} className="brutal-btn brutal-btn-gold">
          ← BACK TO SELECTION
        </button>
      </div>
    );
  }

  const active = schedules[activeIdx];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="font-display text-sm tracking-wider mb-4 hover:underline"
        style={{ color: "var(--cardinal)" }}
      >
        ← BACK TO SELECTION
      </button>

      {/* Ranking info */}
      <p className="text-xs mb-3" style={{ color: "var(--mid)" }}>
        Ranked by average Rate My Professors rating
      </p>

      {/* Schedule tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {schedules.map((sched, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveIdx(i);
              setSaveStatus("idle");
              setScheduleName("");
            }}
            className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
            style={{
              borderColor: "var(--black)",
              background: i === activeIdx ? "var(--cardinal)" : "white",
              color: i === activeIdx ? "white" : "var(--black)",
              borderRadius: "20px",
            }}
          >
            #{i + 1} · ★ {sched.avgRating.toFixed(2)}
          </button>
        ))}
      </div>

      {/* Active schedule */}
      {active && (
        <>
          <div
            className="p-4 border-[2px]"
            style={{
              borderColor: "var(--beige)",
              background: "white",
              borderRadius: "4px",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--mid)" }}>
              Avg RMP:{" "}
              <strong style={{ color: "var(--black)" }}>
                {active.avgRating.toFixed(2)}
              </strong>
            </p>

            <ResultCalendar sections={active.sections} />
          </div>

          {/* Section detail cards */}
          <div className="mt-4 flex flex-col gap-3">
            {active.sections.map((s, i) => {
              const color = COURSE_COLORS[s.colorIndex % COURSE_COLORS.length];
              const rmpKey = `${s.section.instructor?.lastName}, ${s.section.instructor?.firstName}`;
              const rmp = rmpData[rmpKey];
              const time = s.section.times[0];
              const dayDisplay = time ? formatDaysShort(time.day) : "TBA";
              const timeDisplay = time?.start_time
                ? `${dayDisplay} ${formatTime(time.start_time)} - ${formatTime(time.end_time)}`
                : "TBA";
              const instructorName = s.section.instructor?.lastName
                ? `${s.section.instructor.firstName} ${s.section.instructor.lastName}`
                : "";

              return (
                <div
                  key={`${s.course.department}${s.course.number}-${s.section.id}-${i}`}
                  className="p-4 border-[2px]"
                  style={{
                    borderColor: "var(--beige)",
                    background: "white",
                    borderRadius: "4px",
                  }}
                >
                  {/* Course header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: color.bg }}
                    />
                    <span
                      className="font-display text-base tracking-wider"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {s.course.department} {s.course.number}
                    </span>
                  </div>

                  {/* Tags row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {s.geTag && (
                      <span
                        className="px-3 py-0.5 text-xs font-display tracking-wider"
                        style={{
                          background: "var(--gold)",
                          color: "var(--black)",
                          borderRadius: "3px",
                        }}
                      >
                        {s.geTag}
                      </span>
                    )}
                    <span
                      className="text-xs font-display tracking-wider"
                      style={{ color: "#1565C0" }}
                    >
                      {s.section.type}
                    </span>
                  </div>

                  {/* Course title */}
                  <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
                    {s.course.title}
                  </p>

                  {/* Schedule */}
                  <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
                    {timeDisplay} |{" "}
                    {s.section.isClosed
                      ? "CLOSED"
                      : `${s.section.registered}/${s.section.capacity} seats`}
                  </p>

                  {/* Instructor + RMP */}
                  {instructorName && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--black)" }}
                      >
                        {instructorName}
                      </span>
                      {rmp && rmp.avgRating > 0 ? (
                        <a
                          href={`https://www.ratemyprofessors.com/professor/${rmp.legacyId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <span
                            style={{
                              color:
                                rmp.avgRating >= 4
                                  ? "#2E7D32"
                                  : rmp.avgRating >= 3
                                    ? "#F9A825"
                                    : "#C62828",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            ★ {rmp.avgRating.toFixed(1)}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--mid)" }}
                          >
                            Diff: {rmp.avgDifficulty.toFixed(1)}
                          </span>
                        </a>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--mid)" }}
                        >
                          N/A
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save Schedule */}
          <div className="mt-6 pt-4 border-t-[2px] border-[var(--beige)]">
            {saveStatus === "saved" ? (
              <div
                className="w-full py-3 text-center font-display text-sm tracking-wider border-[3px] border-[var(--black)]"
                style={{ background: "var(--gold)", color: "var(--black)" }}
              >
                SCHEDULE SAVED &#10003;
              </div>
            ) : saveStatus === "naming" ||
              saveStatus === "saving" ||
              saveStatus === "error" ? (
              <div
                className="p-4 border-[3px] border-[var(--black)]"
                style={{ background: "var(--cream)" }}
              >
                <p
                  className="font-display text-sm tracking-wider mb-3"
                  style={{ color: "var(--black)" }}
                >
                  NAME YOUR SCHEDULE
                </p>
                <input
                  type="text"
                  placeholder="e.g. Fall Plan A"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="w-full px-4 py-2 text-sm font-display tracking-wider border-[2px] border-[var(--black)] outline-none mb-3"
                  style={{ background: "white", color: "var(--black)" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSaveStatus("idle");
                      setScheduleName("");
                    }}
                    className="flex-1 py-2 font-display text-xs tracking-wider border-[2px] border-[var(--black)] transition-colors hover:bg-[var(--beige)]"
                    style={{ background: "white", color: "var(--black)" }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={async () => {
                      setSaveStatus("saving");
                      try {
                        const res = await fetch("/api/schedules", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: scheduleName.trim() || undefined,
                            semester,
                            courses,
                            preferences: prefs,
                            schedule_data: active,
                          }),
                        });
                        if (!res.ok) throw new Error("Save failed");
                        setSaveStatus("saved");
                      } catch {
                        setSaveStatus("error");
                        setTimeout(() => setSaveStatus("naming"), 2000);
                      }
                    }}
                    disabled={saveStatus === "saving"}
                    className="flex-1 py-2 font-display text-xs tracking-wider border-[2px] border-[var(--black)] transition-all hover:translate-y-[-1px]"
                    style={{
                      background:
                        saveStatus === "error"
                          ? "var(--cardinal)"
                          : "var(--gold)",
                      color: saveStatus === "error" ? "white" : "var(--black)",
                      boxShadow: "3px 3px 0 var(--black)",
                    }}
                  >
                    {saveStatus === "saving"
                      ? "SAVING..."
                      : saveStatus === "error"
                        ? "RETRY"
                        : "SAVE"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setSaveStatus("naming");
                }}
                className="w-full py-3 font-display text-sm tracking-wider border-[3px] border-[var(--black)] transition-all hover:translate-y-[-2px]"
                style={{
                  background: "var(--gold)",
                  color: "var(--black)",
                  boxShadow: "4px 4px 0 var(--black)",
                }}
              >
                SAVE THIS SCHEDULE
              </button>
            )}
          </div>
        </>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="SIGN IN TO SAVE"
        subtitle="Create an account with your school email to save schedules"
      />
    </div>
  );
}
