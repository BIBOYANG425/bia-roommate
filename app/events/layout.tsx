import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Events",
  description:
    "BIA events are designed moments — social experiences, creative workshops, and future-focused salons where USC international students meet, create, and find direction, in LA and across China.",
  alternates: { canonical: "/events" },
};

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}
