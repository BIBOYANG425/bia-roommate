import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join BIA",
  description:
    "Become part of BIA — USC's 1,500+ international student community. Get event invites, company sessions, career support, and housing help.",
  alternates: { canonical: "/join" },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
