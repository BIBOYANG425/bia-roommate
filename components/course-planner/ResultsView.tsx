"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [swappingCourse, setSwappingCourse] = useState<string | null>(null);
  const courseGroupsRef = useRef<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SectionCombo type is scoped inside buildSchedules
    { label: string; isGE: boolean; geTag?: string; combos: any[] }[]
  >([]);

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
            // Section-pinned: "WRIT-340@30001" → dept=WRIT, num=340, pin to section 30001
            const [baseId, pinnedSectionId] = c.id.split("@");
            const parts = baseId.split("-");
            if (parts.length < 2 || !parts[0] || !parts[1]) {
              console.warn(`[ResultsView] Malformed course ID: ${c.id}`);
              continue;
            }
            const res = await fetch(
              `/api/courses/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}?semester=${semester}`,
            );
            if (res.ok) {
              const data = await res.json();
              if (data.sections?.length > 0) {
                // If a specific section was selected (GESM/WRIT), filter to only that section
                if (pinnedSectionId) {
                  const pinned = data.sections.filter(
                    (s: Section) =>
                      s.id === pinnedSectionId || s.number === pinnedSectionId,
                  );
                  if (pinned.length > 0) {
                    const filtered = { ...data, sections: pinned };
                    courseData.push(filtered);
                    selectionMap[c.id].push(filtered);
                  } else {
                    // Fallback: section ID not found, use all sections
                    courseData.push(data);
                    selectionMap[c.id].push(data);
                  }
                } else {
                  courseData.push(data);
                  selectionMap[c.id].push(data);
                }
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

      // Helper: check if a course number is graduate-level (500+)
      const isGraduateLevel = (num: string): boolean => {
        const n = parseInt(num.replace(/[^0-9]/g, ""), 10);
        return !isNaN(n) && n >= 500;
      };

      // Build section combos: lecture + linked lab/discussion/quiz
      type SectionCombo = {
        course: Course;
        sections: Section[]; // all sections in the combo
        allSlots: { day: string; startMin: number; endMin: number }[];
        rating: number; // lecture instructor rating
      };

      function buildCombos(course: Course, geTag?: string): SectionCombo[] {
        let allActive = (course.sections || []).filter((s) => !s.isCancelled);

        // Filter out D-clearance sections if preference is set
        if (prefs.hideDClearance) {
          allActive = allActive.filter((s) => !s.hasDClearance);
        }

        // Group by type
        const byType: Record<string, Section[]> = {};
        for (const s of allActive) {
          const type = (s.type || "Lecture").toLowerCase();
          if (!byType[type]) byType[type] = [];
          byType[type].push(s);
        }

        const types = Object.keys(byType);
        if (types.length === 0) return [];

        // Identify primary type (lecture) and secondary types (lab, discussion, quiz)
        const primaryKey = types.find((t) => t.includes("lecture")) || types[0];
        const secondaryKeys = types.filter((t) => t !== primaryKey);

        const primaries = byType[primaryKey] || [];
        if (primaries.length === 0) return [];

        // If no secondary types, each primary is its own combo
        if (secondaryKeys.length === 0) {
          return primaries
            .map((sec) => {
              const slots = parseSectionTimes(sec.times);
              return {
                course,
                sections: [sec],
                allSlots: slots,
                rating: getRating(sec),
              };
            })
            .filter((c) => c.allSlots.length > 0);
        }

        // Build combos: for each primary, find compatible secondaries
        const combos: SectionCombo[] = [];

        for (const primary of primaries) {
          const primarySlots = parseSectionTimes(primary.times);
          if (primarySlots.length === 0) continue;

          // Find matching secondaries for each type
          const secondaryOptions: Section[][] = secondaryKeys.map((key) => {
            const candidates = byType[key];
            // Filter by linkCode: match if same linkCode, or if either is null/empty
            return candidates.filter((s) => {
              if (!primary.linkCode && !s.linkCode) return true;
              if (!primary.linkCode || !s.linkCode) return true;
              return primary.linkCode === s.linkCode;
            });
          });

          // Check if any required secondary type has no compatible sections
          const hasRequired = secondaryKeys.every((key, i) => {
            // A secondary type is "required" if any section has time slots or is linked
            const hasTimed = byType[key].some(
              (s) => parseSectionTimes(s.times).length > 0 || !!s.linkCode,
            );
            return !hasTimed || secondaryOptions[i].length > 0;
          });
          if (!hasRequired) continue;

          // Generate combos: primary + one from each secondary type
          // For efficiency, limit secondary exploration
          function generateCombos(
            secIdx: number,
            current: Section[],
            currentSlots: { day: string; startMin: number; endMin: number }[],
          ) {
            if (combos.length >= 30) return;
            if (secIdx >= secondaryKeys.length) {
              combos.push({
                course,
                sections: [primary, ...current],
                allSlots: [...currentSlots],
                rating: getRating(primary),
              });
              return;
            }

            const options = secondaryOptions[secIdx];
            // If no timed or linked sections for this type, skip it
            const timedOptions = options.filter(
              (s) => parseSectionTimes(s.times).length > 0 || !!s.linkCode,
            );
            if (timedOptions.length === 0) {
              generateCombos(secIdx + 1, current, currentSlots);
              return;
            }

            for (const sec of timedOptions.slice(0, 8)) {
              const slots = parseSectionTimes(sec.times);
              // Check internal conflicts
              const hasConflict = slots.some((a) =>
                currentSlots.some(
                  (b) =>
                    a.day === b.day &&
                    a.startMin < b.endMin &&
                    b.startMin < a.endMin,
                ),
              );
              if (hasConflict) continue;

              current.push(sec);
              currentSlots.push(...slots);
              generateCombos(secIdx + 1, current, currentSlots);
              current.pop();
              currentSlots.splice(
                currentSlots.length - slots.length,
                slots.length,
              );
            }
          }

          generateCombos(0, [], primarySlots);
        }

        return combos;
      }

      // Group courses by the original selection and build combos
      type CourseGroup = {
        label: string;
        isGE: boolean;
        geTag?: string;
        combos: SectionCombo[];
      };
      const courseGroups: CourseGroup[] = [];

      for (const sel of courses) {
        let matching = selectionMap[sel.id] || [];

        // Filter out graduate-level courses if preference is set
        if (prefs.hideGraduate) {
          matching = matching.filter((c) => !isGraduateLevel(c.number));
        }

        // Filter out Thematic Option (CORE) courses if preference is set
        if (prefs.hideThematicOption) {
          matching = matching.filter(
            (c) =>
              c.department.toUpperCase() !== "CORE" &&
              !c.title.toLowerCase().includes("thematic option"),
          );
        }

        if (matching.length > 0) {
          const isGE = sel.id.startsWith("GE-");
          const geTag = isGE ? sel.id : undefined;
          const allCombos: SectionCombo[] = [];

          for (const c of matching) {
            allCombos.push(...buildCombos(c, geTag));
          }

          // Sort by rating descending
          allCombos.sort((a, b) => b.rating - a.rating);

          if (allCombos.length > 0) {
            courseGroups.push({
              label: sel.label,
              isGE,
              geTag,
              combos: isGE ? allCombos.slice(0, 40) : allCombos,
            });
          }
        }
      }

      // Generate top schedules via backtracking with diversity
      const results: GeneratedSchedule[] = [];
      const maxResults = 5;
      const timeout = Date.now() + 25000;

      // Shuffle combos with similar ratings for diversity
      function shuffleTied<T extends { rating: number }>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          // Only shuffle among items with similar ratings (within 0.15)
          let j = i;
          while (j > 0 && Math.abs(copy[j - 1].rating - copy[i].rating) < 0.15)
            j--;
          const swapIdx = j + Math.floor(Math.random() * (i - j + 1));
          [copy[i], copy[swapIdx]] = [copy[swapIdx], copy[i]];
        }
        return copy;
      }

      function backtrack(
        groupIdx: number,
        selected: ScheduleSection[],
        totalRating: number,
        usedSlots: { day: string; startMin: number; endMin: number }[],
      ) {
        if (Date.now() > timeout) return;
        if (results.length >= maxResults * 10) return;

        if (groupIdx >= courseGroups.length) {
          const ratingCount =
            selected.filter(
              (s) =>
                s.section.type.toLowerCase().includes("lecture") ||
                !s.section.type,
            ).length || selected.length;
          const avg = ratingCount > 0 ? totalRating / ratingCount : 0;
          results.push({
            sections: [...selected],
            avgRating: Math.round(avg * 100) / 100,
          });
          return;
        }

        const group = courseGroups[groupIdx];
        const baseSlice = group.isGE
          ? group.combos.slice(0, 20)
          : group.combos.slice(0, 15);
        const combosToTry = shuffleTied(baseSlice);

        for (const combo of combosToTry) {
          // Check time preferences for all slots
          const meetsPrefs = combo.allSlots.every(
            (s) => s.startMin >= earliestMin && s.endMin <= doneByMin,
          );
          if (!meetsPrefs && (prefs.earliestClass || prefs.doneBy)) continue;

          // Check conflicts with already-selected sections
          const hasConflict = combo.allSlots.some((newSlot) =>
            usedSlots.some(
              (existing) =>
                existing.day === newSlot.day &&
                existing.startMin < newSlot.endMin &&
                newSlot.startMin < existing.endMin,
            ),
          );
          if (hasConflict) continue;

          // Add all sections in the combo
          const newEntries: ScheduleSection[] = combo.sections.map((sec) => ({
            course: combo.course,
            section: sec,
            colorIndex: groupIdx % COURSE_COLORS.length,
            geTag: group.geTag,
          }));

          selected.push(...newEntries);
          const newSlots = [...usedSlots, ...combo.allSlots];

          backtrack(
            groupIdx + 1,
            selected,
            totalRating + combo.rating,
            newSlots,
          );

          selected.splice(
            selected.length - newEntries.length,
            newEntries.length,
          );

          // If we already have enough results, stop exploring this group
          if (results.length >= maxResults * 10) return;
        }
      }

      courseGroupsRef.current = courseGroups;
      backtrack(0, [], 0, []);

      setProgress(95);

      // Sort by average rating and deduplicate, then take top 5
      results.sort((a, b) => b.avgRating - a.avgRating);
      const seen = new Set<string>();
      const top: GeneratedSchedule[] = [];
      for (const r of results) {
        const key = r.sections
          .map((s) => s.section.id)
          .sort()
          .join(",");
        if (!seen.has(key)) {
          seen.add(key);
          top.push(r);
        }
        if (top.length >= maxResults) break;
      }

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

  // Swap a course in the active schedule with an alternative combo
  const handleSwap = useCallback(
    (courseKey: string, comboIdx: number) => {
      const schedule = schedules[activeIdx];
      if (!schedule) return;

      const group = courseGroupsRef.current.find((g) => g.label === courseKey);
      if (!group || comboIdx >= group.combos.length) return;

      const newCombo = group.combos[comboIdx];

      // Check conflicts with other courses' sections
      const courseDeptNum = courseKey.split(" — ")[0] || courseKey;
      const otherSections = schedule.sections.filter(
        (s) => `${s.course.department} ${s.course.number}` !== courseDeptNum,
      );
      const otherSlots = otherSections.flatMap((s) =>
        s.section.times
          .filter((t) => t.start_time && t.day !== "TBA")
          .map((t) => ({
            day: t.day,
            startMin:
              parseInt(t.start_time.split(":")[0]) * 60 +
              parseInt(t.start_time.split(":")[1] || "0"),
            endMin:
              parseInt(t.end_time.split(":")[0]) * 60 +
              parseInt(t.end_time.split(":")[1] || "0"),
          })),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SectionCombo slot type
      const hasConflict = newCombo.allSlots.some((newSlot: any) =>
        otherSlots.some(
          (existing) =>
            existing.day === newSlot.day &&
            existing.startMin < newSlot.endMin &&
            newSlot.startMin < existing.endMin,
        ),
      );

      if (hasConflict) return; // Can't swap — conflicts

      // Replace sections for this course group
      const groupIdx = courseGroupsRef.current.indexOf(group);
      const newSections = [
        ...otherSections,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SectionCombo section type
        ...newCombo.sections.map((sec: any) => ({
          course: newCombo.course,
          section: sec,
          colorIndex: groupIdx % 8,
          geTag: group.geTag,
        })),
      ];

      const updated = [...schedules];
      updated[activeIdx] = {
        ...schedule,
        sections: newSections,
      };
      setSchedules(updated);
      setSwappingCourse(null);
    },
    [schedules, activeIdx],
  );

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
                      className="font-display text-base tracking-wider flex-1"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {s.course.department} {s.course.number}
                    </span>
                    {s.section.type.toLowerCase().includes("lecture") &&
                      (() => {
                        const courseKey = `${s.course.department} ${s.course.number}`;
                        const groupIdx = courseGroupsRef.current.findIndex(
                          (g) => g.label.startsWith(courseKey),
                        );
                        return groupIdx >= 0 ? (
                          <button
                            onClick={() =>
                              setSwappingCourse(
                                swappingCourse === courseKey ? null : courseKey,
                              )
                            }
                            className="font-display text-[10px] tracking-wider px-2 py-0.5 border hover:bg-[var(--gold)] transition-colors"
                            style={{
                              borderColor:
                                swappingCourse === courseKey
                                  ? "var(--gold)"
                                  : "var(--beige)",
                              background:
                                swappingCourse === courseKey
                                  ? "var(--gold)"
                                  : "transparent",
                              borderRadius: "3px",
                            }}
                          >
                            {swappingCourse === courseKey ? "CLOSE" : "SWAP"}
                          </button>
                        ) : null;
                      })()}
                  </div>
                  {/* Swap alternatives panel */}
                  {swappingCourse ===
                    `${s.course.department} ${s.course.number}` &&
                    s.section.type.toLowerCase().includes("lecture") &&
                    (() => {
                      const group = courseGroupsRef.current.find((g) =>
                        g.label.startsWith(
                          `${s.course.department} ${s.course.number}`,
                        ),
                      );
                      if (!group) return null;
                      return (
                        <div
                          className="mb-3 p-3 border-[2px] space-y-2"
                          style={{
                            borderColor: "var(--gold)",
                            background: "var(--cream)",
                            borderRadius: "4px",
                          }}
                        >
                          <p
                            className="font-display text-[10px] tracking-wider"
                            style={{ color: "var(--mid)" }}
                          >
                            ALTERNATIVE SECTIONS
                          </p>
                          {group.combos
                            .slice(0, 8)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SectionCombo type scoped in buildSchedules
                            .map((combo: any, ci: number) => {
                              const lec = combo.sections.find(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Section type scoped in buildSchedules
                                (sec: any) =>
                                  sec.type.toLowerCase().includes("lecture") ||
                                  !sec.type,
                              );
                              if (!lec) return null;
                              const inst = lec.instructor?.lastName
                                ? `${lec.instructor.firstName} ${lec.instructor.lastName}`
                                : "TBA";
                              const time = lec.times?.[0];
                              const timeStr = time?.start_time
                                ? `${time.day} ${time.start_time}`
                                : "TBA";
                              const isCurrent = s.section.id === lec.id;
                              return (
                                <button
                                  key={ci}
                                  onClick={() =>
                                    !isCurrent && handleSwap(group.label, ci)
                                  }
                                  disabled={isCurrent}
                                  className="w-full text-left p-2 border text-xs flex justify-between items-center hover:bg-white transition-colors"
                                  style={{
                                    borderColor: isCurrent
                                      ? "var(--cardinal)"
                                      : "var(--beige)",
                                    background: isCurrent
                                      ? "white"
                                      : "transparent",
                                    borderRadius: "3px",
                                    opacity: isCurrent ? 0.6 : 1,
                                  }}
                                >
                                  <span style={{ color: "var(--black)" }}>
                                    {inst} — {timeStr}
                                  </span>
                                  {isCurrent ? (
                                    <span
                                      className="font-display text-[9px] tracking-wider"
                                      style={{ color: "var(--mid)" }}
                                    >
                                      CURRENT
                                    </span>
                                  ) : (
                                    <span
                                      className="font-display text-[9px] tracking-wider"
                                      style={{ color: "var(--cardinal)" }}
                                    >
                                      SELECT
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      );
                    })()}

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
                    {s.section.hasDClearance && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-display tracking-wider border"
                        style={{
                          borderColor: "var(--cardinal)",
                          color: "var(--cardinal)",
                          background: "rgba(153,0,0,0.05)",
                        }}
                        title={
                          s.section.notes || "Department clearance required"
                        }
                      >
                        D-CLEARANCE
                      </span>
                    )}
                  </div>

                  {/* Course title + topic */}
                  <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
                    {s.course.title}
                  </p>
                  {s.section.topic && s.section.topic !== s.course.title && (
                    <p
                      className="text-xs mb-1 italic"
                      style={{ color: "var(--mid)" }}
                    >
                      {s.section.topic}
                    </p>
                  )}

                  {/* Schedule */}
                  <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
                    {timeDisplay} |{" "}
                    {s.section.isCancelled
                      ? "CANCELLED"
                      : s.section.isClosed
                        ? "CLOSED"
                        : s.section.capacity > 0 &&
                            s.section.registered >= s.section.capacity
                          ? "FULL"
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

                  {/* Prereqs & notes */}
                  {s.course.prereqs && (
                    <p
                      className="text-[11px] mt-2 px-2 py-1 border-l-[2px]"
                      style={{
                        borderColor: "var(--cardinal)",
                        color: "var(--cardinal)",
                        background: "rgba(153,0,0,0.03)",
                      }}
                    >
                      <span className="font-display tracking-wider">
                        PREREQ:
                      </span>{" "}
                      <span style={{ color: "var(--black)" }}>
                        {s.course.prereqs}
                      </span>
                    </p>
                  )}
                  {s.section.notes && (
                    <p
                      className="text-[10px] mt-1 italic"
                      style={{ color: "var(--mid)" }}
                    >
                      {s.section.notes.length > 150
                        ? s.section.notes.substring(0, 150) + "..."
                        : s.section.notes}
                    </p>
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
