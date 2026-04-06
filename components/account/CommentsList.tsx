"use client";

import { schoolAccent, relativeTime } from "@/lib/utils";
import EmptyState from "./EmptyState";

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile: { id: string; name: string; school: string | null } | null;
}

export interface CommentsListProps {
  comments: Comment[];
  onDelete: (id: string) => void;
}

export default function CommentsList({
  comments,
  onDelete,
}: CommentsListProps) {
  if (comments.length === 0) {
    return <EmptyState message="NO COMMENTS YET" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 mt-3">
      {comments.map((c) => (
        <div
          key={c.id}
          className="border-[3px] border-[var(--black)] p-4"
          style={{ background: "white" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {c.profile && (
                <p
                  className="font-display text-xs tracking-wider mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  ON{" "}
                  <span style={{ color: schoolAccent(c.profile.school) }}>
                    {c.profile.name}
                  </span>
                  &apos;S PROFILE
                </p>
              )}
              <p className="text-sm" style={{ color: "var(--black)" }}>
                &ldquo;{c.content}&rdquo;
              </p>
              <p className="text-[10px] mt-1" style={{ color: "var(--mid)" }}>
                {relativeTime(c.created_at)}
              </p>
            </div>
            <button
              onClick={() => onDelete(c.id)}
              className="font-display text-[10px] tracking-wider px-2 py-0.5 border-[2px] border-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white transition-colors shrink-0"
            >
              DELETE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
