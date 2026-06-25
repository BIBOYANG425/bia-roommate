import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find a Roommate at USC",
  description:
    "Connect with USC international students looking for roommates. Browse and post roommate listings on BIA's community roommate board.",
  alternates: { canonical: "/roommates" },
};

export default function RoommatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
