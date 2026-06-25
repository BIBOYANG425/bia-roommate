import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USC Course Ratings",
  description:
    "Student-sourced ratings and rankings for USC courses and professors — find easy A's, top teachers, and the right classes. From BIA.",
  alternates: { canonical: "/course-rating" },
};

export default function CourseRatingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
