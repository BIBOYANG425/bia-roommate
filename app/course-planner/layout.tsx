import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USC Course Planner",
  description:
    "Build a conflict-free USC schedule with the best professors — a free course planner with RateMyProfessor ratings and seat tracking, from BIA.",
  alternates: { canonical: "/course-planner" },
};

export default function CoursePlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
