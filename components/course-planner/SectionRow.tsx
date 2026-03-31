"use client";

import type { Section } from "@/lib/course-planner/types";
import { formatTime, formatDays } from "@/lib/course-planner/conflicts";
import RmpBadge from "./RmpBadge";

interface SectionRowProps {
  section: Section;
  isSelected: boolean;
  hasConflict: boolean;
  conflictWith?: string;
  onToggle: () => void;
}

export default function SectionRow({
  section,
  isSelected,
  hasConflict,
  conflictWith,
  onToggle,
}: SectionRowProps) {
  const time = section.times[0];
  const isTBA = !time || !time.start_time || time.day?.toUpperCase() === "TBA";
  const isClosed = section.isClosed || section.isCancelled;

  return (
    <div
      className={`flex items-center gap-3 p-3 border-[2px] border-[var(--black)] cursor-pointer transition-all ${
        isSelected ? "translate-x-1" : ""
      } ${hasConflict ? "conflict-border" : ""}`}
      style={{
        background: isSelected
          ? "var(--gold)"
          : isClosed
            ? "var(--beige)"
            : "var(--cream)",
        opacity: isClosed ? 0.6 : 1,
      }}
      onClick={onToggle}
    >
      {/* Type badge */}
      <span
        className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] shrink-0"
        style={{
          background: isSelected ? "var(--black)" : "var(--cream)",
          color: isSelected ? "var(--gold)" : "var(--mid)",
        }}
      >
        {(section.type ?? "").toUpperCase().slice(0, 3) || "N/A"}
      </span>

      {/* Time & location */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isTBA ? (
            <span
              className="brutal-tag"
              style={{
                background: "var(--gold)",
                color: "var(--black)",
                fontSize: "9px",
              }}
            >
              TBA
            </span>
          ) : (
            <span
              className="text-xs font-mono"
              style={{ color: "var(--black)" }}
            >
              {formatDays(time.day)} {formatTime(time.start_time)}-
              {formatTime(time.end_time)}
            </span>
          )}
        </div>
        {time?.location && (
          <p className="text-[10px] truncate" style={{ color: "var(--mid)" }}>
            {time.location}
          </p>
        )}
      </div>

      {/* Instructor + RMP */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="text-xs truncate max-w-[100px]"
          style={{ color: "var(--black)" }}
        >
          {section.instructor?.lastName || "Staff"}
        </span>
        {section.instructor?.lastName && (
          <RmpBadge
            firstName={section.instructor.firstName}
            lastName={section.instructor.lastName}
          />
        )}
      </div>

      {/* Seats */}
      <span
        className="text-[10px] font-mono shrink-0"
        style={{ color: "var(--mid)" }}
      >
        {section.registered}/{section.capacity}
      </span>

      {/* Status */}
      {isClosed && (
        <span
          className="brutal-tag"
          style={{
            background: "var(--cardinal)",
            color: "white",
            fontSize: "9px",
          }}
        >
          {section.isCancelled ? "CANCELLED" : "CLOSED"}
        </span>
      )}

      {/* Conflict */}
      {hasConflict && !isSelected && (
        <span
          className="text-[9px] font-display"
          style={{ color: "var(--cardinal)" }}
        >
          CONFLICT{conflictWith ? ` w/ ${conflictWith}` : ""}
        </span>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <span
          className="font-display text-xs"
          style={{ color: "var(--cardinal)" }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
