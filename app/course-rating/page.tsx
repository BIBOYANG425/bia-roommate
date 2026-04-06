"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import CourseRatingSearch from "@/components/course-rating/CourseRatingSearch";
import CourseRatingCard from "@/components/course-rating/CourseRatingCard";
import ReviewModal from "@/components/course-rating/ReviewModal";
import type { CourseAggregate, CourseList } from "@/lib/course-rating/types";

const POPULAR_COURSES = [
  {
    level: "LOWER DIVISION (100-299)",
    levelZh: "基础课程",
    courses: [
      { dept: "CSCI", number: "104", title: "Data Structures" },
      { dept: "CSCI", number: "170", title: "Discrete Methods" },
      {
        dept: "CSCI",
        number: "201",
        title: "Principles of Software Development",
      },
      { dept: "MATH", number: "225", title: "Linear Algebra" },
      { dept: "MATH", number: "226", title: "Calculus III" },
      { dept: "WRIT", number: "150", title: "Writing and Critical Reasoning" },
      { dept: "ECON", number: "203", title: "Principles of Microeconomics" },
      { dept: "PHYS", number: "151", title: "Fundamentals of Physics I" },
      { dept: "ITP", number: "104", title: "Introduction to Computers" },
    ],
  },
  {
    level: "UPPER DIVISION (300-499)",
    levelZh: "高阶课程",
    courses: [
      { dept: "CSCI", number: "310", title: "Software Engineering" },
      {
        dept: "CSCI",
        number: "356",
        title: "Introduction to Computer Systems",
      },
      { dept: "CSCI", number: "360", title: "Introduction to AI" },
      { dept: "BUAD", number: "304", title: "Organizational Behavior" },
      { dept: "BUAD", number: "306", title: "Business Finance" },
      { dept: "ACCT", number: "410", title: "Foundations of Accounting" },
      { dept: "ECON", number: "305", title: "Intermediate Microeconomics" },
      { dept: "ITP", number: "303", title: "Full-Stack Web Development" },
      {
        dept: "COMM",
        number: "322",
        title: "Communication and Social Influence",
      },
    ],
  },
  {
    level: "GRADUATE (500+)",
    levelZh: "研究生课程",
    courses: [
      { dept: "CSCI", number: "570", title: "Analysis of Algorithms" },
      { dept: "CSCI", number: "561", title: "Foundations of AI" },
      { dept: "CSCI", number: "585", title: "Database Systems" },
      {
        dept: "EE",
        number: "503",
        title: "Probability for Electrical Engineers",
      },
      {
        dept: "DSCI",
        number: "510",
        title: "Principles of Programming for Data Science",
      },
      { dept: "DSCI", number: "553", title: "Foundations of Data Mining" },
      { dept: "FBE", number: "529", title: "Financial Analysis and Valuation" },
      { dept: "GSBA", number: "510", title: "Accounting Concepts" },
      { dept: "INF", number: "551", title: "Foundations of Data Management" },
    ],
  },
];

type Tab = "recent" | "top-rated" | "curated";

export default function CourseRatingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("recent");
  const [recent, setRecent] = useState<CourseAggregate[]>([]);
  const [topRated, setTopRated] = useState<CourseAggregate[]>([]);
  const [lists, setLists] = useState<CourseList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading state for tab data fetch
    setLoading(true);
    if (tab === "recent") {
      fetch("/api/course-rating/top-rated?limit=20&sort=recent")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setRecent(Array.isArray(data) ? data : []))
        .catch(() => setRecent([]))
        .finally(() => setLoading(false));
    } else if (tab === "top-rated") {
      fetch("/api/course-rating/top-rated?limit=20")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setTopRated(Array.isArray(data) ? data : []))
        .catch(() => setTopRated([]))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/course-rating/lists")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setLists(Array.isArray(data) ? data : []))
        .catch(() => setLists([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <main className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <NavTabs />

      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)] px-6 py-5"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">
            BIA 课评
          </h1>
          <p className="text-sm text-white/60">
            USC COURSE RATINGS — BY STUDENTS, FOR STUDENTS
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-6">
          <label
            className="font-display text-sm tracking-wider mb-2 block"
            style={{ color: "var(--cardinal)" }}
          >
            SEARCH COURSES
          </label>
          <CourseRatingSearch />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "recent" as Tab, label: "最近评价" },
            { key: "top-rated" as Tab, label: "热门推荐" },
            { key: "curated" as Tab, label: "推荐课单" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-display tracking-wider border-[2px] transition-all"
              style={{
                borderColor: "var(--black)",
                background: tab === t.key ? "var(--cardinal)" : "white",
                color: tab === t.key ? "white" : "var(--black)",
                borderRadius: "20px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="brutal-card p-4 animate-pulse flex flex-col gap-2"
              >
                <div
                  className="h-6 w-24"
                  style={{ background: "var(--beige)" }}
                />
                <div
                  className="h-3 w-full"
                  style={{ background: "var(--beige)" }}
                />
                <div
                  className="h-3 w-3/4"
                  style={{ background: "var(--beige)" }}
                />
                <div
                  className="h-3 w-1/2"
                  style={{ background: "var(--beige)" }}
                />
              </div>
            ))}
          </div>
        ) : tab === "recent" || tab === "top-rated" ? (
          (tab === "recent" ? recent : topRated).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tab === "recent" ? recent : topRated).map((agg) => (
                <CourseRatingCard
                  key={`${agg.dept}-${agg.course_number}`}
                  aggregate={agg}
                />
              ))}
            </div>
          ) : (
            <div>
              <div
                className="border-[3px] border-[var(--cardinal)] p-6 text-center mb-6"
                style={{ background: "var(--cream)" }}
              >
                <p className="font-display text-lg mb-2">
                  BE THE FIRST TO REVIEW!
                </p>
                <p className="font-mono text-[11px] text-[var(--mid)] mb-4">
                  还没有课评，搜索课程或点击下方热门课程，分享你的体验
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="brutal-btn brutal-btn-primary text-sm"
                >
                  WRITE A REVIEW
                </button>
              </div>

              <p className="font-display text-sm tracking-wider mb-3">
                DISCOVER BY INTEREST
              </p>
              {POPULAR_COURSES.map((section) => (
                <div key={section.level} className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className="font-display text-xs tracking-wider"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {section.level}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--mid)]">
                      {section.levelZh}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {section.courses.map((c) => (
                      <button
                        key={`${c.dept}-${c.number}`}
                        onClick={() =>
                          router.push(`/course-rating/${c.dept}/${c.number}`)
                        }
                        className="brutal-card p-4 cursor-pointer text-left flex flex-col gap-1"
                      >
                        <span
                          className="font-display text-base"
                          style={{ color: "var(--cardinal)" }}
                        >
                          {c.dept} {c.number}
                        </span>
                        <span className="font-mono text-[11px]">{c.title}</span>
                        <span
                          className="font-display text-[10px] tracking-wider mt-1"
                          style={{ color: "var(--cardinal)" }}
                        >
                          WRITE REVIEW →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : lists.length > 0 ? (
          <div className="flex flex-col gap-6">
            {lists.map((list) => (
              <div key={list.id}>
                <h2 className="font-display text-lg tracking-wider mb-1">
                  {list.title}
                </h2>
                {list.description && (
                  <p className="font-mono text-[11px] text-[var(--mid)] mb-3">
                    {list.description}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.courses.map((c) => (
                    <Link
                      key={`${c.dept}-${c.number}`}
                      href={`/course-rating/${c.dept}/${c.number}`}
                      className="brutal-card p-4 cursor-pointer flex flex-col gap-1"
                    >
                      <span
                        className="font-display text-base"
                        style={{ color: "var(--cardinal)" }}
                      >
                        {c.dept} {c.number}
                      </span>
                      <span className="font-mono text-[11px]">{c.title}</span>
                      <div className="flex gap-2 mt-1">
                        {c.units && (
                          <span className="brutal-tag text-[9px]">
                            {c.units} units
                          </span>
                        )}
                        {c.geTag && (
                          <span className="brutal-tag brutal-tag-gold text-[9px]">
                            {c.geTag}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="border-[3px] border-[var(--black)] p-8 text-center"
            style={{ background: "var(--cream)" }}
          >
            <p className="font-display text-lg mb-2">
              CURATED LISTS COMING SOON
            </p>
            <p className="font-mono text-[11px] text-[var(--mid)]">
              Search for a course above to see or write reviews.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t-[3px] border-[var(--black)]">
        <p
          className="font-display text-xs tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          BIA 课评 — USC COURSE RATINGS
        </p>
      </footer>

      {showReviewModal && (
        <ReviewModal onClose={() => setShowReviewModal(false)} />
      )}
    </main>
  );
}
