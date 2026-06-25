import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USC Apartments",
  description:
    "Curated apartments near USC for international students — filter by price, distance, and amenities, with community vote rankings. From BIA.",
  alternates: { canonical: "/apartments" },
};

export default function ApartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
