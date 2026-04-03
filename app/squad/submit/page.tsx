"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import { useAuth } from "@/components/AuthProvider";
import {
  SQUAD_CATEGORIES,
  SQUAD_GENDER_OPTIONS,
  SCHOOL_OPTIONS,
} from "@/lib/types";
import { CATEGORY_COLORS } from "@/components/squad/SquadCard";

export default function SquadSubmitPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [category, setCategory] = useState<string>(SQUAD_CATEGORIES[0]);
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [maxPeople, setMaxPeople] = useState(2);
  const [deadline, setDeadline] = useState("");
  const [genderRestriction, setGenderRestriction] = useState("不限");
  const [posterName, setPosterName] = useState("");
  const [school, setSchool] = useState("");
  const [contact, setContact] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!posterName.trim()) {
      setError("请填写昵称");
      return;
    }
    if (!content.trim()) {
      setError("请填写内容");
      return;
    }
    if (!contact.trim()) {
      setError("请填写联系方式");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_name: posterName.trim(),
          school: school || null,
          category,
          content: content.trim(),
          location: location.trim() || null,
          max_people: maxPeople,
          deadline: deadline || null,
          gender_restriction: genderRestriction,
          contact: contact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "发布失败，请重试");
        return;
      }
      router.push("/squad?posted=true");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen">
        <NavTabs />
        <div className="flex items-center justify-center h-96">
          <p
            className="font-display text-2xl"
            style={{ color: "var(--mid)" }}
          >
            LOADING...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen">
        <NavTabs />
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <h2
            className="font-display text-4xl mb-4"
            style={{ color: "var(--black)" }}
          >
            SIGN IN FIRST
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--mid)" }}>
            发帖需要先登录。
          </p>
          <Link href="/squad" className="brutal-btn brutal-btn-ghost">
            ← BACK
          </Link>
        </div>
      </main>
    );
  }

  const catColor = CATEGORY_COLORS[category] ?? "#1a1410";

  return (
    <main className="min-h-screen">
      <NavTabs />

      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)] flex items-center gap-4 px-6 py-4"
        style={{ background: "var(--cream)" }}
      >
        <Link
          href="/squad"
          className="font-display text-sm tracking-wider px-3 py-1 border-[2px] border-[var(--black)] hover:bg-[var(--beige)] transition-colors"
          style={{ color: "var(--black)" }}
        >
          ← BACK
        </Link>
        <h1 className="font-display text-2xl" style={{ color: "var(--black)" }}>
          发布搭子
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8"
      >
        {/* Category */}
        <div>
          <label
            className="font-display text-sm tracking-[0.1em] block mb-3"
            style={{ color: "var(--black)" }}
          >
            分类
          </label>
          <div className="flex flex-wrap gap-0">
            {SQUAD_CATEGORIES.map((c) => {
              const active = category === c;
              const color = CATEGORY_COLORS[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="font-display text-sm px-6 py-3 border-[3px] border-[var(--black)] -mr-[3px] -mb-[3px] transition-colors"
                  style={{
                    background: active ? color : "var(--cream)",
                    color: active ? "white" : "var(--mid)",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nickname + School */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="font-display text-sm tracking-[0.1em] block mb-2"
              style={{ color: "var(--black)" }}
            >
              昵称 *
            </label>
            <input
              type="text"
              value={posterName}
              onChange={(e) => setPosterName(e.target.value)}
              placeholder="你的昵称..."
              maxLength={20}
              required
              className="brutal-input"
            />
          </div>
          <div>
            <label
              className="font-display text-sm tracking-[0.1em] block mb-2"
              style={{ color: "var(--black)" }}
            >
              学校
            </label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="brutal-select"
            >
              <option value="">不填</option>
              {SCHOOL_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div>
          <label
            className="font-display text-sm tracking-[0.1em] block mb-2"
            style={{ color: "var(--black)" }}
          >
            内容 *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说说你想找什么搭子，几点出发，有什么要求..."
            maxLength={500}
            required
            rows={5}
            className="brutal-input resize-none"
          />
          <p
            className="text-[10px] mt-1 text-right"
            style={{ color: "var(--mid)" }}
          >
            {content.length} / 500
          </p>
        </div>

        {/* Location */}
        <div>
          <label
            className="font-display text-sm tracking-[0.1em] block mb-2"
            style={{ color: "var(--black)" }}
          >
            地点
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="添加地点（选填）..."
            maxLength={100}
            className="brutal-input"
          />
        </div>

        {/* People count + Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="font-display text-sm tracking-[0.1em] block mb-2"
              style={{ color: "var(--black)" }}
            >
              人数上限
            </label>
            <div className="flex items-center border-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
              <button
                type="button"
                onClick={() => setMaxPeople((n) => Math.max(2, n - 1))}
                className="font-display text-xl px-5 py-2 border-r-[3px] border-[var(--black)] hover:bg-[var(--beige)] transition-colors"
                style={{ color: "var(--black)" }}
              >
                −
              </button>
              <span
                className="font-display text-xl flex-1 text-center py-2"
                style={{ color: "var(--black)" }}
              >
                {maxPeople}
              </span>
              <button
                type="button"
                onClick={() => setMaxPeople((n) => Math.min(50, n + 1))}
                className="font-display text-xl px-5 py-2 border-l-[3px] border-[var(--black)] hover:bg-[var(--beige)] transition-colors"
                style={{ color: "var(--black)" }}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label
              className="font-display text-sm tracking-[0.1em] block mb-2"
              style={{ color: "var(--black)" }}
            >
              截止日期
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="brutal-input"
            />
          </div>
        </div>

        {/* Contact */}
        <div>
          <label
            className="font-display text-sm tracking-[0.1em] block mb-2"
            style={{ color: "var(--black)" }}
          >
            联系方式 *
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="微信 / Instagram / 手机号..."
            maxLength={100}
            required
            className="brutal-input"
          />
        </div>

        {/* Gender restriction */}
        <div>
          <label
            className="font-display text-sm tracking-[0.1em] block mb-3"
            style={{ color: "var(--black)" }}
          >
            性别要求
          </label>
          <div className="flex gap-0">
            {SQUAD_GENDER_OPTIONS.map((g) => {
              const active = genderRestriction === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderRestriction(g)}
                  className="font-display text-sm flex-1 py-3 border-[3px] border-[var(--black)] -mr-[3px] transition-colors"
                  style={{
                    background: active ? "var(--black)" : "var(--cream)",
                    color: active ? "var(--gold)" : "var(--mid)",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            className="font-display text-sm"
            style={{ color: "var(--cardinal)" }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="brutal-btn flex-1 text-center"
            style={{
              background: catColor,
              color: "white",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "发布中..." : "发布"}
          </button>
          <Link
            href="/squad"
            className="brutal-btn brutal-btn-ghost text-center flex-1"
          >
            取消
          </Link>
        </div>
      </form>
    </main>
  );
}
