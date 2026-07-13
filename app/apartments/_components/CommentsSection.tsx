"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { ProductLanguage } from "@/components/ProductShell";
import type { RedditSeed } from "@/lib/apartments/data";

// ─── Comments Section ─────────────────────────────────────────────────────────

interface ApartmentComment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function CommentsSection({
  aptId,
  seeds,
  language,
}: {
  aptId: string;
  seeds: RedditSeed[];
  language: ProductLanguage;
}) {
  const [comments, setComments] = useState<ApartmentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("apartment_comments")
      .select("id, author_name, content, created_at")
      .eq("apartment_id", aptId)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: ApartmentComment[] | null }) => {
        setComments(data || []);
        setLoadingComments(false);
      });
  }, [aptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase
      .from("apartment_comments")
      .insert({ apartment_id: aptId, author_name: name.trim(), content: body.trim() });
    if (error) {
      setSubmitError(language === "zh" ? "提交失败，请重试" : "Submission failed, please retry");
    } else {
      const newComment: ApartmentComment = {
        id: Date.now().toString(),
        author_name: name.trim(),
        content: body.trim(),
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [newComment, ...prev]);
      setName("");
      setBody("");
      setSubmitDone(true);
      setTimeout(() => setSubmitDone(false), 4000);
    }
    setSubmitting(false);
  }

  return (
    <div className="border-t-[3px] border-[var(--black)] mt-0" style={{ background: "var(--beige)" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h3 className="font-display text-[28px] sm:text-[36px]" style={{ color: "var(--black)" }}>
          {language === "zh" ? "学生评价" : "REVIEWS"}
        </h3>

        {/* Reddit seed comments */}
        <div className="mt-5 flex flex-col gap-4">
          {seeds.map((seed, i) => (
            <div
              key={i}
              className="border-[2px] border-[var(--black)] p-4"
              style={{ background: "var(--cream)" }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-display text-[11px] tracking-wider" style={{ color: "var(--cardinal)" }}>
                  r/{seed.subreddit}
                </span>
                <span className="text-[11px] font-bold" style={{ color: "var(--black)" }}>
                  u/{seed.username}
                </span>
                <span
                  className="border border-[var(--black)] px-2 py-0.5 font-display text-[10px] tracking-wider"
                  style={{ background: "var(--gold)", color: "var(--black)" }}
                >
                  ↑ {seed.score.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--mid)" }}>
                  Reddit
                </span>
              </div>
              <p className="text-sm leading-6" style={{ color: "var(--black)" }}>
                {seed.body}
              </p>
            </div>
          ))}
        </div>

        {/* Supabase student comments */}
        {loadingComments ? null : comments.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="border-[2px] border-[var(--black)] p-4"
                style={{ background: "white" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-display text-sm" style={{ color: "var(--black)" }}>
                    {c.author_name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--mid)" }}>
                    {new Date(c.created_at).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}
                  </span>
                </div>
                <p className="text-sm leading-6" style={{ color: "var(--black)" }}>
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Submit form */}
        <div className="mt-6 border-[3px] border-[var(--black)] p-5" style={{ background: "var(--cream)" }}>
          <p className="font-display text-[13px] tracking-[0.12em] mb-4" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "分享你的居住体验" : "SHARE YOUR EXPERIENCE"}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder={language === "zh" ? "昵称（如：USC研究生）" : "Nickname (e.g. USC grad student)"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              className="brutal-input"
            />
            <textarea
              placeholder={language === "zh" ? "写下你的评价，帮助其他同学选房..." : "Share your experience to help other students..."}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              required
              className="brutal-input resize-none"
            />
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting || !name.trim() || !body.trim()}
                className="brutal-btn brutal-btn-primary text-base px-6 py-3 disabled:opacity-40"
              >
                {submitting
                  ? (language === "zh" ? "提交中..." : "SUBMITTING...")
                  : (language === "zh" ? "提交评价" : "SUBMIT")}
              </button>
              {submitDone && (
                <span className="font-display text-xs tracking-wider" style={{ color: "var(--cardinal)" }}>
                  {language === "zh" ? "已提交！感谢分享" : "SUBMITTED! THANK YOU"}
                </span>
              )}
              {submitError && (
                <span className="text-xs" style={{ color: "var(--cardinal)" }}>{submitError}</span>
              )}
              <span className="ml-auto text-[10px]" style={{ color: "var(--mid)" }}>
                {body.length}/500
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
