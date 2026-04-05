"use client";

import { SquadPost } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import Image from "next/image";

export const CATEGORY_COLORS: Record<string, string> = {
  拼车: "#2D6A4F",
  自习: "#014B83",
  约会: "#990000",
  健身: "#B85C00",
  游戏: "#7B2D8E",
  其它: "#8c7e6a",
};

export default function SquadCard({
  post,
  onClick,
}: {
  post: SquadPost;
  onClick: () => void;
}) {
  const catColor = CATEGORY_COLORS[post.category] ?? "#1a1410";
  const isFull = post.current_people >= post.max_people;

  return (
    <div
      className="brutal-card p-5 cursor-pointer flex flex-col gap-3 relative"
      role="button"
      tabIndex={0}
      aria-label={`${post.poster_name}的${post.category}搭子帖子`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header: avatar + name + category tag */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {post.avatar_url ? (
            <Image
              src={post.avatar_url}
              alt={post.poster_name}
              width={40}
              height={40}
              className="w-10 h-10 object-cover border-[3px] border-[var(--black)] shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 flex items-center justify-center text-white font-display text-lg border-[3px] border-[var(--black)] shrink-0"
              style={{ backgroundColor: catColor }}
            >
              {post.poster_name.charAt(post.poster_name.length - 1)}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="font-display text-base truncate"
              style={{ color: "var(--black)" }}
            >
              {post.poster_name}
            </p>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              {post.school ?? ""}
              {post.school ? " · " : ""}
              {relativeTime(post.created_at)}
            </p>
          </div>
        </div>
        <span
          className="brutal-tag shrink-0 font-display text-[11px]"
          style={{
            backgroundColor: catColor,
            color: "white",
            borderColor: catColor,
          }}
        >
          {post.category}
        </span>
      </div>

      {/* Content */}
      <p
        className="text-xs line-clamp-2 leading-relaxed"
        style={{ color: "var(--black)" }}
      >
        {post.content}
      </p>

      {/* Photo strip */}
      {post.photos && post.photos.length > 0 && (
        <div className="flex gap-2">
          {post.photos.slice(0, 3).map((url, i) => (
            <Image
              key={i}
              src={url}
              alt={`Photo ${i + 1}`}
              width={80}
              height={56}
              className="w-20 h-14 object-cover border-[2px] border-[var(--black)]"
            />
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {post.location && (
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            ◎ {post.location}
          </span>
        )}
        {post.deadline && (
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--mid)" }}
          >
            截止 {new Date(post.deadline).toLocaleDateString("zh-CN")}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t-[2px] border-[var(--black)] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-display text-sm"
            style={{ color: isFull ? "var(--cardinal)" : "var(--black)" }}
          >
            {post.current_people}/{post.max_people} 人
          </span>
          {post.gender_restriction !== "不限" && (
            <span className="brutal-tag">{post.gender_restriction}</span>
          )}
          {isFull && <span className="brutal-tag brutal-tag-filled">已满</span>}
        </div>
        <span
          className="font-display text-xs tracking-wider"
          style={{ color: catColor }}
        >
          查看 →
        </span>
      </div>
    </div>
  );
}
