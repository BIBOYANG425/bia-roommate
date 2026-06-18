import { useState, useEffect } from "react";
import type { SavedScheduleSummary } from "../../shared/types";
import { SEMESTER_OPTIONS } from "../../shared/constants";

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

export function SavedSchedules() {
  const [email, setEmail] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<SavedScheduleSummary[]>([]);
  const [authBusy, setAuthBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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
          <div key={s.id} className="course-card">
            <div className="course-card-header">
              <span className="course-card-id">{s.name}</span>
              <span className="ge-tag">{semesterLabel(s.semester)}</span>
            </div>
            <div className="course-card-meta">
              <span>Saved {formatDate(s.created_at)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
