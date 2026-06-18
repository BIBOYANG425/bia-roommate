import { useState, useEffect } from "react";
import type { ExtensionSettings, SavedScheduleSummary } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/types";
import { EXTENSION_VERSION, SEMESTER_OPTIONS } from "../../shared/constants";

export function Settings() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<SavedScheduleSummary[]>([]);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "AUTH_GET_EMAIL" })
      .then((r) => {
        if (r?.type === "AUTH_RESULT") setEmail(r.email);
      })
      .catch(() => {});
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

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "GET_SETTINGS" })
      .then((response) => {
        if (response?.type === "SETTINGS_RESULT") {
          setSettings(response.settings);
        }
      })
      .catch(() => {});
  }, []);

  async function updateSetting<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
  ) {
    const previous = settings;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_SETTINGS",
        settings: updated,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Re-fetch current settings from storage instead of using stale snapshot
      chrome.runtime
        .sendMessage({ type: "GET_SETTINGS" })
        .then((response) => {
          if (response?.type === "SETTINGS_RESULT") {
            setSettings(response.settings);
          } else {
            setSettings(previous);
          }
        })
        .catch(() => setSettings(previous));
    }
  }

  return (
    <div>
      <p className="section-title">Account</p>
      {email ? (
        <>
          <div className="setting-row">
            <div>
              <div className="setting-label">Signed in</div>
              <div className="setting-description">{email}</div>
            </div>
            <button
              className="link-button"
              onClick={handleSignOut}
              disabled={authBusy}
            >
              Sign out
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="setting-label">My Schedules</div>
            {schedules.length === 0 ? (
              <div className="setting-description">No saved schedules yet.</div>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="setting-description">
                  {s.name} · {s.semester}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="setting-row">
          <div>
            <div className="setting-label">Not signed in</div>
            <div className="setting-description">
              Sign in to save schedules to your BIA account.
            </div>
          </div>
          <button
            className="link-button"
            onClick={handleSignIn}
            disabled={authBusy}
          >
            {authBusy ? "…" : "Sign in"}
          </button>
        </div>
      )}
      <p className="section-title">Features</p>

      <div className="setting-row">
        <div>
          <div className="setting-label">RMP Ratings</div>
          <div className="setting-description">
            Show professor ratings next to names
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showRmpRatings}
            onChange={(e) => updateSetting("showRmpRatings", e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-label">Conflict Highlights</div>
          <div className="setting-description">
            Highlight time conflicts on WebReg
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.highlightConflicts}
            onChange={(e) =>
              updateSetting("highlightConflicts", e.target.checked)
            }
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-label">Seat Counts</div>
          <div className="setting-description">
            Show enrollment badges on sections
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showSeatCounts}
            onChange={(e) => updateSetting("showSeatCounts", e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <p className="section-title" style={{ marginTop: 16 }}>
        Semester
      </p>

      <select
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#FAF6EC",
          border: "3px solid #1A1410",
          borderRadius: 4,
          color: "#1A1410",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
        value={settings.semester}
        onChange={(e) => updateSetting("semester", e.target.value)}
      >
        {SEMESTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {saved && (
        <div
          style={{
            textAlign: "center",
            marginTop: 12,
            color: "#990000",
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          Settings saved
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a
          className="link-button"
          href="https://bia-roommate.vercel.app/course-planner"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open BIA Course Planner →
        </a>
        <div
          style={{
            fontSize: 10,
            color: "#8C7E6A",
            marginTop: 8,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          BIA Course Helper v{EXTENSION_VERSION}
        </div>
      </div>
    </div>
  );
}
