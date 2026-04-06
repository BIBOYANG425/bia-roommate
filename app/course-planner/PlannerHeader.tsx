"use client";

import NavTabs from "@/components/NavTabs";
import OnboardingTour from "@/components/course-planner/OnboardingTour";
import Toast from "@/components/Toast";

interface PlannerHeaderProps {
  showTour: boolean;
  onTourComplete: () => void;
  onTourOpen: () => void;
  error: string | null;
  onDismissError: () => void;
}

export default function PlannerHeader({
  showTour,
  onTourComplete,
  onTourOpen,
  error,
  onDismissError,
}: PlannerHeaderProps) {
  return (
    <>
      <NavTabs />

      {showTour && <OnboardingTour onComplete={onTourComplete} />}

      {/* Header */}
      <div
        className="border-b-[3px] border-[var(--black)] px-6 py-5"
        style={{ background: "var(--cardinal)" }}
      >
        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-1">
            BIA 选课
          </h1>
          <p className="text-sm text-white/60">
            USC COURSE PLANNER — FIND YOUR BEST SCHEDULE
          </p>
          <button
            onClick={onTourOpen}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-1 font-display text-[11px] tracking-wider border-[2px] border-white/40 text-white/70 hover:text-white hover:border-white transition-all"
            style={{ borderRadius: 4 }}
          >
            TOUR
          </button>
        </div>
      </div>

      {error && <Toast message={error} onClose={onDismissError} />}
    </>
  );
}
