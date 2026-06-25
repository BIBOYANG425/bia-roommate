import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USC Sublets",
  description:
    "Find and post short-term sublets near USC for international students — summer, semester, and lease-takeover listings. From BIA.",
  alternates: { canonical: "/sublet" },
};

export default function SubletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
