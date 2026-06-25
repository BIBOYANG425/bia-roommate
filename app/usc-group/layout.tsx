import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USC Student Groups",
  description:
    "Join BIA's USC international student group chats by class year — connect with 1,500+ members across four class-year communities.",
  alternates: { canonical: "/usc-group" },
};

export default function UscGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
