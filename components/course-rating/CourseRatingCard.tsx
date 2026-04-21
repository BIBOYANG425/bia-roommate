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
  units,
}: {
  aggregate: CourseAggregate;
  title?: string;
  units?: string;
}) {
  const code = `${aggregate.dept} ${aggregate.course_number}`;
  const profPreview = aggregate.professors?.filter(Boolean) ?? [];

  return (
    <Link
      href={`/course-rating/${aggregate.dept}/${aggregate.course_number}`}
      className="brutal-card cursor-pointer flex flex-col"
    >
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Course code + units */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="font-display text-xl"
            style={{ color: "var(--cardinal)" }}
          >
            {code}
          </span>
          {units && (
            <span className="brutal-tag brutal-tag-gold text-[9px]">
              {units} units
            </span>
          )}
        </div>

        {/* Title */}
        {title && (
          <p
            className="font-mono text-[11px] leading-snug line-clamp-2"
            style={{ color: "var(--black)" }}
          >
            {title}
          </p>
        )}

        {profPreview.length > 0 && (
          <p
            className="font-mono text-[10px] leading-snug text-[var(--mid)] line-clamp-2"
            title={profPreview.join(", ")}
          >
            {profPreview.slice(0, 3).join(" · ")}
            {profPreview.length > 3 ? " · …" : ""}
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
