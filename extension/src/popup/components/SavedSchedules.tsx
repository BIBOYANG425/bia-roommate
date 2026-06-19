import { useState, useEffect } from "react";
import type {
  SavedScheduleSummary,
  SavedScheduleDetail,
  SelectedSection,
  SectionTime,
} from "../../shared/types";
import { SEMESTER_OPTIONS, COURSE_COLORS } from "../../shared/constants";
import { MiniCalendar } from "./MiniCalendar";

function semesterLabel(code: string): string {
  return SEMESTER_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function instructorName(sec: SelectedSection): string {
  const i = sec.section.instructor;
  if (i?.firstName) return `${i.firstName} ${i.lastName}`;
  return i?.lastName || "TBA";
}

function formatTimes(times: SectionTime[]): string {
  const parts = times
    .filter((t) => t.start_time && t.end_time)
    .map(
      (t) =>
        `${t.day} ${t.start_time}–${t.end_time}` +
        (t.location ? ` · ${t.location}` : ""),
    );
  return parts.length ? parts.join("  /  ") : "Time TBA";
}

export function SavedSchedules() {
  const [email, setEmail] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<SavedScheduleSummary[]>([]);
  const [authBusy, setAuthBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detail-view state
  const [detail, setDetail] = useState<SavedScheduleDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "AUTH_GET_EMAIL" })
      .then((r) => {
        if (r?.type === "AUTH_RESULT") setEmail(r.email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!email) {
      setSchedules([]);
      return;
    }
    chrome.runtime
      .sendMessage({ type: "LIST_SCHEDULES" })
      .then((r) => {
        if (r?.type === "LIST_SCHEDULES_RESULT") setSchedules(r.schedules);
      })
      .catch(() => {});
  }, [email]);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    setDetailError(null);
    try {
      const r = await chrome.runtime.sendMessage({ type: "GET_SCHEDULE", id });
      if (r?.type === "GET_SCHEDULE_RESULT") setDetail(r.schedule);
      else if (r?.type === "AUTH_REQUIRED") {
        setEmail(null); // session expired — bounce back to sign-in
        closeDetail();
      } else setDetailError("Couldn’t load this schedule. Try again.");
    } catch {
      setDetailError("Couldn’t load this schedule. Try again.");
    }
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
  }

  async function handleSignIn() {
    setAuthBusy(true);
    try {
      const r = await chrome.runtime.sendMessage({ type: "AUTH_SIGN_IN" });
      if (r?.type === "AUTH_RESULT") setEmail(r.email);
    } catch {
      // user cancelled / window closed — stay signed out
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await chrome.runtime.sendMessage({ type: "AUTH_SIGN_OUT" });
      setEmail(null);
      closeDetail();
    } finally {
      setAuthBusy(false);
    }
  }

  if (loading) {
    return <div className="loading-text">Loading…</div>;
  }

  // Signed-out: a single, on-brand sign-in call to action.
  if (!email) {
    return (
      <div>
        <p className="section-title">Your Schedules</p>
        <div className="empty-state" style={{ marginBottom: 14 }}>
          Sign in with your USC email to save schedules from the Optimizer and
          see them here on any device.
        </div>
        <button
          className="btn-primary"
          onClick={handleSignIn}
          disabled={authBusy}
        >
          {authBusy ? "Opening…" : "Sign in"}
        </button>
      </div>
    );
  }

  // Detail view — a single saved schedule expanded.
  if (detailId) {
    const summary = schedules.find((s) => s.id === detailId);
    const sections = detail?.schedule_data?.sections ?? [];
    return (
      <div>
        <button
          className="link-button"
          onClick={closeDetail}
          style={{ marginBottom: 12, border: "none" }}
        >
          ← Back
        </button>

        <p className="section-title">
          {detail?.name ?? summary?.name ?? "Schedule"}
          {" · "}
          {semesterLabel(detail?.semester ?? summary?.semester ?? "")}
        </p>

        {detailError ? (
          <div className="error-message">{detailError}</div>
        ) : !detail ? (
          <div className="loading-text">Loading schedule…</div>
        ) : sections.length === 0 ? (
          <div className="empty-state">
            This schedule has no saved sections.
          </div>
        ) : (
          <>
            <MiniCalendar sections={sections} />
            {sections.map((sec) => {
              const color =
                COURSE_COLORS[sec.colorIndex % COURSE_COLORS.length];
              return (
                <div
                  key={`${sec.courseId}-${sec.section.id}`}
                  className="course-card"
                >
                  <div className="course-card-header">
                    <span
                      className="course-card-id"
                      style={{
                        color: color.bg === "#1A1410" ? "#FFCC00" : color.bg,
                      }}
                    >
                      {sec.courseId}
                    </span>
                    <span style={{ fontSize: 11, color: "#8C7E6A" }}>
                      {sec.section.type} · {sec.units} units
                    </span>
                  </div>
                  {sec.courseTitle && (
                    <div className="course-card-title">{sec.courseTitle}</div>
                  )}
                  <div className="course-card-meta">
                    <span>{formatTimes(sec.section.times)}</span>
                  </div>
                  <div className="course-card-meta">
                    <span>{instructorName(sec)}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // List view.
  return (
    <div>
      <div className="account-bar">
        <div style={{ minWidth: 0 }}>
          <div className="account-label">Signed in</div>
          <div className="account-email">{email}</div>
        </div>
        <button
          className="link-button"
          onClick={handleSignOut}
          disabled={authBusy}
        >
          Sign out
        </button>
      </div>

      <p className="section-title">Saved Schedules ({schedules.length})</p>

      {schedules.length === 0 ? (
        <div className="empty-state">
          No saved schedules yet. Build one in the Optimizer and tap “Save to
          BIA account.”
        </div>
      ) : (
        schedules.map((s) => (
          <div
            key={s.id}
            className="course-card"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onClick={() => openDetail(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetail(s.id);
              }
            }}
          >
            <div className="course-card-header">
              <span className="course-card-id">{s.name}</span>
              <span className="ge-tag">{semesterLabel(s.semester)}</span>
            </div>
            <div className="course-card-meta">
              <span>Saved {formatDate(s.created_at)}</span>
              <span aria-hidden="true">View ›</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
