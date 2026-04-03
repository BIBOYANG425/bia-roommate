"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SquadPost } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { CATEGORY_COLORS } from "./SquadCard";

export default function SquadModal({
  post,
  onClose,
  onCountChange,
}: {
  post: SquadPost;
  onClose: () => void;
  onCountChange?: (id: string, newCount: number) => void;
}) {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [count, setCount] = useState(post.current_people);
  const catColor = CATEGORY_COLORS[post.category] ?? "#1a1410";
  const isFull = count >= post.max_people;

  // Check if user already joined
  useEffect(() => {
    if (!user) return;
    import("@/lib/supabase/client").then(({ createBrowserSupabaseClient }) => {
      const supabase = createBrowserSupabaseClient();
      supabase
        .from("squad_members")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then((result) => setHasJoined(!!result.data))
        .catch(() => {});
    });
  }, [user, post.id]);

  const handleJoin = useCallback(async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      const res = await fetch("/api/squad/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) return;
        const newCount = data.joined ? count + 1 : Math.max(1, count - 1);
        setHasJoined(data.joined);
        setCount(newCount);
        onCountChange?.(post.id, newCount);
      }
    } finally {
      setJoining(false);
    }
  }, [user, joining, post.id, count, onCountChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,20,16,0.75)" }}
      onClick={onClose}
    >
      <div
        className="brutal-container w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between p-5 border-b-[3px] border-[var(--black)]"
          style={{ background: "var(--cream)" }}
        >
          <span
            className="font-display text-2xl"
            style={{ color: "var(--black)" }}
          >
            详情
          </span>
          <div className="flex items-center gap-3">
            <span
              className="brutal-tag font-display text-[12px]"
              style={{
                backgroundColor: catColor,
                color: "white",
                borderColor: catColor,
              }}
            >
              {post.category}
            </span>
            <button
              onClick={onClose}
              className="font-display text-xl px-2"
              style={{ color: "var(--mid)" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Poster info */}
        <div
          className="p-5 border-b-[3px] border-[var(--black)] flex items-center gap-3"
          style={{ background: "var(--cream)" }}
        >
          {post.avatar_url ? (
            <img
              src={post.avatar_url}
              alt={post.poster_name}
              className="w-12 h-12 object-cover border-[3px] border-[var(--black)] shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 flex items-center justify-center text-white font-display text-xl border-[3px] border-[var(--black)] shrink-0"
              style={{ backgroundColor: catColor }}
            >
              {post.poster_name.charAt(post.poster_name.length - 1)}
            </div>
          )}
          <div>
            <p
              className="font-display text-lg"
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

        {/* Content */}
        <div
          className="p-5 border-b-[3px] border-[var(--black)]"
          style={{ background: "var(--cream)" }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--black)", lineHeight: "1.75" }}
          >
            {post.content}
          </p>
        </div>

        {/* Photos */}
        {post.photos && post.photos.length > 0 && (
          <div
            className="p-5 border-b-[3px] border-[var(--black)] flex flex-wrap gap-3"
            style={{ background: "var(--cream)" }}
          >
            {post.photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-28 h-24 object-cover border-[2px] border-[var(--black)]"
              />
            ))}
          </div>
        )}

        {/* Details */}
        <div
          className="p-5 border-b-[3px] border-[var(--black)] flex flex-col gap-4"
          style={{ background: "var(--cream)" }}
        >
          {post.location && (
            <div className="flex items-center justify-between border-b border-[var(--beige)] pb-3">
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                地点
              </span>
              <span
                className="font-display text-sm"
                style={{ color: "var(--black)" }}
              >
                {post.location}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-[var(--beige)] pb-3">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              人数
            </span>
            <span
              className="font-display text-sm"
              style={{ color: isFull ? "var(--cardinal)" : "var(--black)" }}
            >
              {count} / {post.max_people} 人{isFull ? "（已满）" : ""}
            </span>
          </div>
          {post.deadline && (
            <div className="flex items-center justify-between border-b border-[var(--beige)] pb-3">
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                截止时间
              </span>
              <span
                className="font-display text-sm"
                style={{ color: "var(--black)" }}
              >
                {new Date(post.deadline).toLocaleDateString("zh-CN")}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--mid)" }}
            >
              性别要求
            </span>
            <span
              className="font-display text-sm"
              style={{ color: "var(--black)" }}
            >
              {post.gender_restriction}
            </span>
          </div>
        </div>

        {/* Contact */}
        {post.contact && (
          <CopyContact contact={post.contact} />
        )}

        {/* Join button */}
        <div className="p-5" style={{ background: "var(--cream)" }}>
          {user ? (
            <button
              onClick={handleJoin}
              disabled={(!hasJoined && isFull) || joining}
              className="brutal-btn w-full text-center text-lg"
              style={{
                background:
                  !hasJoined && isFull
                    ? "var(--beige)"
                    : hasJoined
                      ? "var(--black)"
                      : "var(--gold)",
                color:
                  !hasJoined && isFull
                    ? "var(--mid)"
                    : hasJoined
                      ? "var(--gold)"
                      : "var(--black)",
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? "处理中..." : !hasJoined && isFull ? "已满员" : hasJoined ? "退出" : "加入"}
            </button>
          ) : (
            <p
              className="text-center font-display text-sm py-2"
              style={{ color: "var(--mid)" }}
            >
              登录后加入
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyContact({ contact }: { contact: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(contact);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  return (
    <div
      className="p-4 border-b-[3px] border-[var(--black)] flex items-center justify-between"
      style={{ background: "var(--gold)" }}
    >
      <div>
        <p
          className="text-[10px] uppercase tracking-wider font-display mb-1"
          style={{ color: "var(--black)" }}
        >
          CONTACT
        </p>
        <p className="font-display text-2xl" style={{ color: "var(--black)" }}>
          {contact}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="font-display text-[10px] tracking-wider px-3 py-1.5 border-[2px] border-[var(--black)] hover:bg-white transition-colors shrink-0"
        style={{ background: copied ? "white" : "transparent" }}
      >
        {copied ? "COPIED!" : "COPY"}
      </button>
    </div>
  );
}
