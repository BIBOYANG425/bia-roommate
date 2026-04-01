"use client";

import type { Course, Section } from "@/lib/course-planner/types";
import { parseSectionTimes, formatTime } from "@/lib/course-planner/conflicts";
import { COURSE_COLORS } from "@/lib/course-planner/colors";
import ResultCalendar from "./ResultCalendar";

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
  geTag?: string;
}

interface SavedScheduleViewProps {
  name: string;
  semester: string;
  sections: ScheduleSection[];
  avgRating: number;
  onBack: () => void;
}

export default function SavedScheduleView({
  name,
  semester,
  sections,
  avgRating,
  onBack,
}: SavedScheduleViewProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="font-display text-xs tracking-wider hover:opacity-60 transition-opacity"
          style={{ color: "var(--mid)" }}
        >
          ← BACK TO ACCOUNT
        </button>
      </div>

      <div
        className="p-4 border-[3px] border-[var(--black)] mb-4"
        style={{ background: "var(--cream)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="font-display text-2xl tracking-wider"
              style={{ color: "var(--black)" }}
            >
              {name}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--mid)" }}>
              {semester} · {sections.length} sections · Avg RMP:{" "}
              <strong style={{ color: "var(--black)" }}>
                {avgRating.toFixed(2)}
              </strong>
            </p>
          </div>
          <span
            className="font-display text-[10px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)]"
            style={{ background: "var(--gold)" }}
          >
            SAVED
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="mb-4 border-[3px] border-[var(--black)] overflow-hidden"
        style={{ background: "white" }}
      >
        <ResultCalendar sections={sections} />
      </div>

      {/* Section cards */}
      <div className="flex flex-col gap-3">
        {sections.map((s, i) => {
          const color = COURSE_COLORS[s.colorIndex % COURSE_COLORS.length];
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

              <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
                {s.course.title}
              </p>

              <p className="text-sm mb-2" style={{ color: "var(--mid)" }}>
                {timeDisplay} |{" "}
                {s.section.isClosed
                  ? "CLOSED"
                  : `${s.section.registered}/${s.section.capacity} seats`}
              </p>

              {instructorName && (
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--black)" }}
                >
                  {instructorName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
