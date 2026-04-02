"use client";

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

export default function AggregateRatings({
  difficulty,
  workload,
  grading,
  reviewCount,
}: {
  difficulty: number;
  workload: number;
  grading: number;
  reviewCount: number;
}) {
  return (
    <div className="border-[3px] border-[var(--black)] p-4" style={{ background: "var(--cream)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-sm tracking-wider">RATINGS</span>
        <span className="font-mono text-[10px] text-[var(--mid)]">
          {reviewCount} review{reviewCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <RatingBar label="难度" value={difficulty} colorFn={difficultyColor} />
        <RatingBar label="工作量" value={workload} colorFn={difficultyColor} />
        <RatingBar label="给分" value={grading} colorFn={gradingColor} />
      </div>
    </div>
  );
}
