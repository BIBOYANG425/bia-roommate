"use client";

import Link from "next/link";
import type { CourseAggregate } from "@/lib/course-rating/types";
import RatingBar from "./RatingBar";

function difficultyColor(v: number) {
  if (v <= 2) return "#2d6a4f";
  if (v <= 3.5) return "var(--gold)";
  return "var(--cardinal)";
}

function gradingColor(v: number) {
  if (v >= 4) return "#2d6a4f";
  if (v >= 3) return "var(--gold)";
  return "var(--cardinal)";
}

export default function CourseRatingCard({
  aggregate,
  title,
}: {
  aggregate: CourseAggregate;
  title?: string;
}) {
  const code = `${aggregate.dept} ${aggregate.course_number}`;

  return (
    <Link
      href={`/course-rating/${aggregate.dept}/${aggregate.course_number}`}
      className="brutal-card cursor-pointer flex flex-col"
    >
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Course code */}
        <span
          className="font-display text-xl"
          style={{ color: "var(--cardinal)" }}
        >
          {code}
        </span>

        {/* Title */}
        {title && (
          <p
            className="font-mono text-[11px] leading-snug line-clamp-2"
            style={{ color: "var(--black)" }}
          >
            {title}
          </p>
        )}

        {/* Mini rating bars */}
        <div className="flex flex-col gap-1 mt-1">
          <RatingBar
            label="难度"
            value={aggregate.avg_difficulty}
            colorFn={difficultyColor}
          />
          <RatingBar
            label="工作量"
            value={aggregate.avg_workload}
            colorFn={difficultyColor}
          />
          <RatingBar
            label="给分"
            value={aggregate.avg_grading}
            colorFn={gradingColor}
          />
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2 border-t-[2px] border-[var(--black)] flex items-center justify-between">
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--mid)" }}
          >
            {aggregate.review_count} review
            {aggregate.review_count !== 1 ? "s" : ""}
          </span>
          <span
            className="font-display text-xs tracking-wider"
            style={{ color: "var(--cardinal)" }}
          >
            VIEW →
          </span>
        </div>
      </div>
    </Link>
  );
}
