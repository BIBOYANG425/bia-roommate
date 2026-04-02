"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import AggregateRatings from "@/components/course-rating/AggregateRatings";
import ProfessorPills from "@/components/course-rating/ProfessorPills";
import ReviewCard from "@/components/course-rating/ReviewCard";
import ReviewForm from "@/components/course-rating/ReviewForm";
import type {
  CourseReview,
  CourseAggregate,
  ReviewsResponse,
} from "@/lib/course-rating/types";

interface CourseData {
  department: string;
  number: string;
  title: string;
  units: string;
  description: string;
  prereqs?: string;
  sections: {
    instructor: { firstName: string; lastName: string };
    topic?: string;
  }[];
}

export default function CourseRatingDetailPage() {
  const params = useParams<{ dept: string; number: string }>();
  const dept = (params.dept as string).toUpperCase();
  const courseNumber = params.number as string;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [aggregate, setAggregate] = useState<CourseAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfessor, setSelectedProfessor] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [courseResult, reviewsResult] = await Promise.allSettled([
      fetch(`/api/courses/${dept}/${courseNumber}`),
      fetch(
        `/api/course-rating/reviews?dept=${encodeURIComponent(dept)}&number=${encodeURIComponent(courseNumber)}`
      ),
    ]);

    // Course data
    if (courseResult.status === "fulfilled" && courseResult.value.ok) {
      const data = await courseResult.value.json();
      setCourse(data);
    }

    // Reviews + aggregate
    if (reviewsResult.status === "fulfilled" && reviewsResult.value.ok) {
      const data: ReviewsResponse = await reviewsResult.value.json();
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || null);
    } else {
      setError("Failed to load reviews.");
    }

    setLoading(false);
  }, [dept, courseNumber]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Merge professors from reviews + USC sections
  const allProfessors = (() => {
    const set = new Set<string>();
    if (aggregate?.professors) {
      aggregate.professors.forEach((p) => set.add(p));
    }
    if (course?.sections) {
      course.sections.forEach((s) => {
        if (s.instructor?.lastName) {
          const name = [s.instructor.firstName, s.instructor.lastName]
            .filter(Boolean)
            .join(" ");
          if (name) set.add(name);
        }
      });
    }
    return Array.from(set).sort();
  })();

  // Filter reviews by selected professor
  const filteredReviews = selectedProfessor
    ? reviews.filter((r) => r.professor === selectedProfessor)
    : reviews;

  async function handleDelete(id: string) {
    const res = await fetch(`/api/course-rating/reviews?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchData();
    }
  }

  const courseCode = `${dept} ${courseNumber}`;

  return (
    <main className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <NavTabs />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/course-rating"
          className="font-display text-sm tracking-wider mb-4 block hover:underline"
          style={{ color: "var(--cardinal)" }}
        >
          ← BACK TO COURSE RATINGS
        </Link>

        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-10 w-48" style={{ background: "var(--beige)" }} />
            <div className="h-6 w-72" style={{ background: "var(--beige)" }} />
            <div
              className="h-32 border-[3px] border-[var(--beige)]"
              style={{ background: "var(--cream)" }}
            />
            <div
              className="h-24 border-[3px] border-[var(--beige)]"
              style={{ background: "var(--cream)" }}
            />
          </div>
        ) : (
          <>
            {/* Course header */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1
                  className="font-display text-3xl sm:text-4xl"
                  style={{ color: "var(--cardinal)" }}
                >
                  {courseCode}
                </h1>
                {course?.units && (
                  <span className="brutal-tag brutal-tag-gold text-[10px]">
                    {course.units} units
                  </span>
                )}
              </div>
              {course?.title && (
                <p className="font-mono text-sm mt-1" style={{ color: "var(--black)" }}>
                  {course.title}
                </p>
              )}
            </div>

            {/* Aggregate ratings (top per design review) */}
            {aggregate && aggregate.review_count > 0 ? (
              <div className="mb-6">
                <AggregateRatings
                  difficulty={aggregate.avg_difficulty}
                  workload={aggregate.avg_workload}
                  grading={aggregate.avg_grading}
                  reviewCount={aggregate.review_count}
                />
              </div>
            ) : (
              <div
                className="border-[3px] border-[var(--cardinal)] p-6 text-center mb-6"
                style={{ background: "var(--cream)" }}
              >
                <p className="font-display text-lg mb-1">BE THE FIRST TO REVIEW!</p>
                <p className="font-mono text-[11px] text-[var(--mid)] mb-3">
                  这门课还没有评价，来分享你的体验吧
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="brutal-btn brutal-btn-primary text-sm"
                >
                  WRITE A REVIEW
                </button>
              </div>
            )}

            {/* Professor pills */}
            {allProfessors.length > 0 && (
              <div className="mb-6">
                <label className="font-display text-sm tracking-wider mb-2 block">
                  PROFESSORS
                </label>
                <ProfessorPills
                  professors={allProfessors}
                  selected={selectedProfessor}
                  onSelect={setSelectedProfessor}
                />
              </div>
            )}

            {/* Description (collapsible) */}
            {course?.description && (
              <div className="mb-6">
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="font-display text-sm tracking-wider hover:underline"
                  style={{ color: "var(--black)" }}
                >
                  {showDescription ? "HIDE DETAILS ▲" : "COURSE DETAILS ▼"}
                </button>
                {showDescription && (
                  <div
                    className="mt-2 p-4 border-[2px] border-[var(--black)]"
                    style={{ background: "var(--cream)" }}
                  >
                    <p className="font-mono text-[12px] leading-relaxed mb-2">
                      {course.description}
                    </p>
                    {course.prereqs && (
                      <p className="font-mono text-[11px] text-[var(--mid)]">
                        Prerequisites: {course.prereqs}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reviews list */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-sm tracking-wider">
                  REVIEWS ({filteredReviews.length})
                </span>
                {selectedProfessor && (
                  <span className="font-mono text-[10px] text-[var(--mid)]">
                    Filtered by: {selectedProfessor}
                  </span>
                )}
              </div>

              {error && (
                <div
                  className="border-[2px] border-[var(--cardinal)] p-4 mb-3"
                  style={{ background: "var(--cream)" }}
                >
                  <p className="font-mono text-[11px] text-[var(--cardinal)] mb-2">
                    {error}
                  </p>
                  <button
                    onClick={fetchData}
                    className="brutal-btn text-[11px]"
                  >
                    RETRY
                  </button>
                </div>
              )}

              {filteredReviews.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : reviews.length > 0 && selectedProfessor ? (
                <p className="font-mono text-[11px] text-[var(--mid)]">
                  No reviews for {selectedProfessor} yet.
                </p>
              ) : !error ? (
                <p className="font-mono text-[11px] text-[var(--mid)]">
                  No reviews yet. Be the first to share your experience!
                </p>
              ) : null}
            </div>

            {/* Add review button */}
            <button
              onClick={() => setShowReviewModal(true)}
              className="brutal-btn brutal-btn-primary text-sm w-full"
            >
              ADD A REVIEW
            </button>
          </>
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

      {/* Review modal overlay */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReviewModal(false);
          }}
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <ReviewForm
              dept={dept}
              courseNumber={courseNumber}
              professors={allProfessors}
              onSubmitted={fetchData}
              onClose={() => setShowReviewModal(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
