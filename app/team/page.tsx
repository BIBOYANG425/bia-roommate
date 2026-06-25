import type { Metadata } from "next";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Team & Leadership",
  description:
    "How BIA is organized — a student leadership team and 80+ cohort fellows selected through competitive, interview-based rounds each semester.",
  alternates: { canonical: "/team" },
};

const STRUCTURE = [
  {
    title: "Leadership team",
    body: "Officers run BIA's programming, partnerships, technology, and operations — planning events, managing the community, and building the tools members use.",
  },
  {
    title: "Cohort fellows",
    body: "80+ past and current fellows, selected through competitive, interview-based rounds each semester. Fellows lead initiatives and mentor incoming students.",
  },
  {
    title: "Class-year groups",
    body: "The community is organized into four class-year groups, so members connect with peers at the same stage and pass knowledge down each year.",
  },
  {
    title: "Advisors & partners",
    body: "BIA works alongside USC contacts and industry partners who support events, recruiting sessions, and career resources for members.",
  },
];

export default function TeamPage() {
  return (
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Team & Leadership
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[0.95] sm:text-[64px]">
            Run by students, for students
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--mid)" }}>
            BIA is led by a team of USC international students and a competitive
            cohort of fellows. Below is how we are organized — individual
            leadership profiles are on the way.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {STRUCTURE.map((s) => (
            <div key={s.title} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
              <h2 className="font-display text-xl">{s.title}</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--mid)" }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Placeholder for real leadership profiles */}
        <div className="mt-10 border-[3px] border-dashed p-8 text-center" style={{ borderColor: "var(--mid)", background: "var(--cream)" }}>
          <p className="font-display text-lg">Leadership profiles coming soon</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--mid)" }}>
            Officer and advisor bios with names, roles, and photos will appear
            here.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
