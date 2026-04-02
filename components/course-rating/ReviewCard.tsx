"use client";

import type { CourseReview } from "@/lib/course-rating/types";

export default function ReviewCard({
  review,
  onDelete,
}: {
  review: CourseReview;
  onDelete?: (id: string) => void;
}) {
  const date = new Date(review.created_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="border-[2px] border-[var(--black)] p-4"
      style={{ background: "var(--cream)" }}
    >
      {/* Header: term + professor + date */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {review.term && (
          <span className="brutal-tag brutal-tag-gold text-[9px]">
            {review.term}
          </span>
        )}
        {review.professor && (
          <span className="brutal-tag brutal-tag-filled text-[9px]">
            {review.professor}
          </span>
        )}
        <span className="font-mono text-[10px] text-[var(--mid)] ml-auto">
          {date}
        </span>
      </div>

      {/* Ratings row */}
      <div className="flex gap-4 mb-2">
        <MiniRating label="难度" value={review.difficulty} />
        <MiniRating label="工作量" value={review.workload} />
        <MiniRating label="给分" value={review.grading} />
        {review.gpa && (
          <span className="font-mono text-[11px]">
            GPA: <strong>{review.gpa}</strong>
          </span>
        )}
      </div>

      {/* Comment */}
      <p className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
        {review.comment}
      </p>

      {/* Delete button for own reviews */}
      {review.isOwn && onDelete && (
        <button
          onClick={() => onDelete(review.id)}
          className="mt-2 font-mono text-[10px] text-[var(--cardinal)] hover:underline"
        >
          删除
        </button>
      )}
    </div>
  );
}

function MiniRating({ label, value }: { label: string; value: number }) {
  const color =
    value <= 2 ? "#2d6a4f" : value <= 3.5 ? "var(--gold)" : "var(--cardinal)";
  return (
    <span className="font-mono text-[11px]">
      {label} <strong style={{ color }}>{value}</strong>
      <span className="text-[var(--mid)]">/5</span>
    </span>
  );
}
