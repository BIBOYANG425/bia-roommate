import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squad",
  description:
    "Find your people at USC — BIA Squad helps international students connect, match on shared interests, and build their community.",
  alternates: { canonical: "/squad" },
};

export default function SquadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
