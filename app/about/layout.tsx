import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About",
  description:
    "BIA is a student-led community starting from USC, exploring how humanity, technology, and art can reshape the way young people connect, experience, and belong.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
