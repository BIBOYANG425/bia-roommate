"use client";

import { COURSE_COLORS } from "@/lib/course-planner/colors";

const CALENDAR_START_HOUR = 8;
const ROW_HEIGHT = 30;

interface CalendarBlockProps {
  courseId: string;
  sectionType: string;
  location: string;
  instructor: string;
  colorIndex: number;
  startMin: number;
  endMin: number;
}

export default function CalendarBlock({
  courseId,
  sectionType,
  location,
  instructor,
  colorIndex,
  startMin,
  endMin,
}: CalendarBlockProps) {
  const color = COURSE_COLORS[colorIndex % COURSE_COLORS.length];
  const topOffset = Math.max(
    0,
    ((startMin - CALENDAR_START_HOUR * 60) / 30) * ROW_HEIGHT,
  );
  const height = Math.max(((endMin - startMin) / 30) * ROW_HEIGHT, ROW_HEIGHT);

  return (
    <div
      className="course-block"
      style={{
        top: `${topOffset}px`,
        height: `${height}px`,
        backgroundColor: color.bg,
        color: color.text,
      }}
    >
      <div className="course-block-title">{courseId}</div>
      {height > 35 && (
        <div className="text-[9px] opacity-80 truncate">
          {sectionType} — {instructor}
        </div>
      )}
      {height > 50 && location && (
        <div className="text-[9px] opacity-60 truncate">{location}</div>
      )}
    </div>
  );
}
