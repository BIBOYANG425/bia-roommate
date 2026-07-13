import { useState, useEffect, useCallback } from "react";
import type { Course, SelectedSection } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/types";
import { COURSE_COLORS } from "../../shared/constants";
// Same framework-free solver the web app's ResultsView runs (SANCTIONED: the
// extension's schedule scoring converges to site behavior). Lives at the repo
// root so both the Next build and the extension's tsc compile it.
import { buildSchedules } from "../../../../shared/schedule-solver";
import { parseSectionTimes } from "../../../../shared/schedule-conflicts";
import { MiniCalendar } from "./MiniCalendar";

// ─── GE categories (same as web app) ───

const GE_CATEGORIES = [
  { code: "GE-A", name: "The Arts" },
  { code: "GE-B", name: "Humanistic Inquiry" },
  { code: "GE-C", name: "Social Analysis" },
  { code: "GE-D", name: "Life Sciences" },
  { code: "GE-E", name: "Physical Sciences" },
  { code: "GE-F", name: "Quantitative Reasoning" },
  { code: "GE-G", name: "Global Perspectives I" },
  { code: "GE-H", name: "Global Perspectives II" },
] as const;

interface CourseGroup {
  label: string;
  isGE: boolean;
  options: Course[];
}

// ─── Main Component ───

export function ScheduleOptimizer() {
  const [courseCodes, setCourseCodes] = useState<string[]>([]);
  const [selectedGEs, setSelectedGEs] = useState<Set<string>>(new Set());
  const [optimizedSections, setOptimizedSections] = useState<SelectedSection[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [hideDClearance, setHideDClearance] = useState(false);
  const [hideGraduate, setHideGraduate] = useState(false);
  const [hideThematicOption, setHideThematicOption] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "auth" | "error">("idle");

  // Read course bin from chrome.storage (persists across pages)
  useEffect(() => {
    // Try session storage first (set by content script), fall back to local
    chrome.storage.session
      .get(["courseCodes"])
      .then((data) => {
        if (data.courseCodes?.length > 0) {
          setCourseCodes(data.courseCodes);
          // Persist to local storage so it's available on all pages
          chrome.storage.local.set({ savedCourseCodes: data.courseCodes });
        } else {
          // Fall back to previously saved codes
          chrome.storage.local.get(["savedCourseCodes"]).then((local) => {
            if (local.savedCourseCodes?.length > 0) {
              setCourseCodes(local.savedCourseCodes);
            }
          });
        }
      })
      .catch(() => {
        chrome.storage.local
          .get(["savedCourseCodes"])
          .then((local) => {
            if (local.savedCourseCodes?.length > 0) {
              setCourseCodes(local.savedCourseCodes);
            }
          })
          .catch(() => {});
      });
  }, []);

  function toggleGE(code: string) {
    setSelectedGEs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function removeCourse(code: string) {
    const updated = courseCodes.filter((c) => c !== code);
    setCourseCodes(updated);
    chrome.storage.local.set({ savedCourseCodes: updated });
    chrome.storage.session.set({ courseCodes: updated }).catch(() => {});
  }

  const handleOptimize = useCallback(async () => {
    setSaveState("idle");
    const totalItems = courseCodes.length + selectedGEs.size;
    if (totalItems === 0) return;

    setLoading(true);
    setError(null);
    setOptimizedSections([]);

    try {
      const settings = await chrome.storage.local.get("settings");
      const semester =
        settings.settings?.semester ?? DEFAULT_SETTINGS.semester;
      const groups: CourseGroup[] = [];

      // Fetch regular courses from course bin
      if (courseCodes.length > 0) {
        setStatus(`Fetching ${courseCodes.length} courses...`);
        const response = await chrome.runtime.sendMessage({
          type: "COURSEBIN_DETAILS",
          courses: courseCodes,
          semester,
        });
        if (response?.type === "ERROR") {
          setError(`Failed to fetch courses: ${response.error}`);
          return;
        }
        if (response?.type === "COURSEBIN_RESULT" && response.courses) {
          for (const course of response.courses) {
            groups.push({
              label: `${course.department}-${course.number}`,
              isGE: false,
              options: [course],
            });
          }
        }
      }

      // Fetch GE courses for each selected category
      for (const geCode of selectedGEs) {
        setStatus(`Fetching ${geCode} courses...`);
        const response = await chrome.runtime.sendMessage({
          type: "GE_COURSES",
          category: geCode,
          semester,
        });
        if (response?.type === "ERROR") {
          setError(`Failed to fetch ${geCode}: ${response.error}`);
          return;
        }
        if (response?.type === "GE_RESULT" && response.courses?.length > 0) {
          groups.push({
            label: geCode,
            isGE: true,
            options: response.courses,
          });
        }
      }

      if (groups.length === 0) {
        setError(
          "No course data found. Check your course bin or GE selections.",
        );
        return;
      }

      // Apply filters
      const isGradLevel = (num: string) => {
        const n = parseInt(num.replace(/[^0-9]/g, ""), 10);
        return !isNaN(n) && n >= 500;
      };

      for (const g of groups) {
        if (hideGraduate) {
          g.options = g.options.filter((c) => !isGradLevel(c.number));
        }
        if (hideThematicOption) {
          g.options = g.options.filter(
            (c) =>
              c.department.toUpperCase() !== "CORE" &&
              !c.title.toLowerCase().includes("thematic option"),
          );
        }
        if (hideDClearance) {
          for (const c of g.options) {
            c.sections = c.sections.filter((s) => !s.hasDClearance);
          }
        }
        g.options = g.options.filter((c) => c.sections.length > 0);
      }

      setStatus("Finding optimal schedule...");

      // Small delay so status renders
      await new Promise((r) => setTimeout(r, 50));

      // Adapt the extension's course groups to the shared solver's inputs. No RMP
      // data in the extension → an empty cache makes every section score neutrally,
      // so the solver just returns a conflict-free arrangement.
      const selections = groups.map((g) => ({ id: g.label, label: g.label }));
      const selectionMap: Record<string, Course[]> = {};
      for (const g of groups) selectionMap[g.label] = g.options;

      const { schedules } = buildSchedules({
        selections,
        selectionMap,
        rmpCache: {},
        prefs: {
          earliestClass: "",
          doneBy: "",
          excludeFull: true,
          blockedDays: [],
          hideDClearance,
          hideGraduate,
          hideThematicOption,
        },
        colorCount: COURSE_COLORS.length,
        maxResults: 1,
      });

      const best = schedules[0];
      const result: SelectedSection[] = best
        ? best.sections.map((s) => ({
            courseId: `${s.course.department}-${s.course.number}`,
            courseTitle: s.course.title,
            units: s.course.units,
            section: s.section,
            colorIndex: s.colorIndex,
            timeSlots: parseSectionTimes(s.section.times),
          }))
        : [];
      setOptimizedSections(result);

      if (result.length === 0) {
        setError(
          "No conflict-free schedule found. Try removing a course or GE.",
        );
      }
    } catch (err) {
      setError((err as Error).message || "Failed to optimize schedule");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }, [
    courseCodes,
    selectedGEs,
    hideDClearance,
    hideGraduate,
    hideThematicOption,
  ]);

  async function handleSaveToAccount() {
    if (optimizedSections.length === 0) return;
    setSaveState("saving");
    try {
      const settings = await chrome.storage.local.get("settings");
      const semester = settings.settings?.semester ?? DEFAULT_SETTINGS.semester;
      const courses = [...courseCodes, ...selectedGEs];
      const r = await chrome.runtime.sendMessage({
        type: "SAVE_SCHEDULE",
        semester,
        courses,
        schedule_data: { sections: optimizedSections },
      });
      if (r?.type === "SAVE_SCHEDULE_RESULT") setSaveState("saved");
      else if (r?.type === "AUTH_REQUIRED") setSaveState("auth");
      else setSaveState("error");
    } catch {
      setSaveState("error");
    }
  }

  async function handleSignInThenSave() {
    try {
      const r = await chrome.runtime.sendMessage({ type: "AUTH_SIGN_IN" });
      if (r?.type === "AUTH_RESULT" && r.email) await handleSaveToAccount();
      else setSaveState("idle"); // cancelled or no email
    } catch {
      setSaveState("idle");
    }
  }

  const canOptimize = courseCodes.length > 0 || selectedGEs.size > 0;

  return (
    <div>
      {/* Course Bin */}
      <p className="section-title">My Courses</p>
      {courseCodes.length > 0 ? (
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {courseCodes.map((code) => (
            <button
              key={code}
              type="button"
              className="match-tag"
              style={{ fontSize: 11, cursor: "pointer" }}
              aria-label={`Remove ${code}`}
              onClick={() => removeCourse(code)}
            >
              {code} ✕
            </button>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: 11,
            color: "#8C7E6A",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Open myCourseBin on WebReg to load your courses.
        </p>
      )}

      {/* GE Selection */}
      <p className="section-title">GE Requirements</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginBottom: 16,
        }}
      >
        {GE_CATEGORIES.map((ge) => (
          <label
            key={ge.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              background: selectedGEs.has(ge.code) ? "#990000" : "#FAF6EC",
              border: `2px solid ${selectedGEs.has(ge.code) ? "#1A1410" : "#F2EBD9"}`,
              color: selectedGEs.has(ge.code) ? "#fff" : "#8C7E6A",
              transition: "all 0.1s",
            }}
          >
            <input
              type="checkbox"
              checked={selectedGEs.has(ge.code)}
              onChange={() => toggleGE(ge.code)}
              style={{ accentColor: "#990000", width: 12, height: 12 }}
            />
            <span>
              <b>{ge.code}</b> {ge.name}
            </span>
          </label>
        ))}
      </div>

      {/* Filters */}
      <p className="section-title">Filters</p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginBottom: 12,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#1A1410",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hideDClearance}
            onChange={(e) => setHideDClearance(e.target.checked)}
            style={{ accentColor: "#990000", width: 12, height: 12 }}
          />
          Hide D-clearance sections
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#1A1410",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hideGraduate}
            onChange={(e) => setHideGraduate(e.target.checked)}
            style={{ accentColor: "#990000", width: 12, height: 12 }}
          />
          Hide graduate-level courses (500+)
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#1A1410",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hideThematicOption}
            onChange={(e) => setHideThematicOption(e.target.checked)}
            style={{ accentColor: "#990000", width: 12, height: 12 }}
          />
          Hide Thematic Option (CORE)
        </label>
      </div>

      {/* Build button */}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-text">{status || "Loading..."}</div>
      ) : (
        <button
          className="btn-primary"
          onClick={handleOptimize}
          disabled={!canOptimize}
          style={{ opacity: canOptimize ? 1 : 0.5 }}
        >
          Build Best Schedule
        </button>
      )}

      {/* Results */}
      {optimizedSections.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: 16 }}>
            Optimal Schedule ({optimizedSections.length} sections)
          </p>
          <MiniCalendar sections={optimizedSections} />
          <div style={{ marginTop: 12, textAlign: "center" }}>
            {saveState === "auth" ? (
              <button className="link-button" onClick={handleSignInThenSave}>
                Sign in to save
              </button>
            ) : (
              <button
                className="link-button"
                onClick={handleSaveToAccount}
                disabled={saveState === "saving"}
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved ✓"
                    : saveState === "error"
                      ? "Save failed — retry"
                      : "Save to BIA account"}
              </button>
            )}
          </div>
          {optimizedSections.map((sec) => {
            const color = COURSE_COLORS[sec.colorIndex % COURSE_COLORS.length];
            const instructor = sec.section.instructor;
            const instrName = instructor?.firstName
              ? `${instructor.firstName} ${instructor.lastName}`
              : instructor?.lastName || "TBA";
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
                    {sec.section.type} &middot; {sec.units} units
                    {sec.section.hasDClearance && (
                      <span
                        style={{
                          marginLeft: 4,
                          color: "#990000",
                          fontWeight: 700,
                        }}
                        title={
                          sec.section.notes || "Department clearance required"
                        }
                      >
                        D-CLR
                      </span>
                    )}
                    {sec.section.isClosed && (
                      <span
                        style={{
                          marginLeft: 4,
                          padding: "1px 4px",
                          background: "#990000",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 9,
                          letterSpacing: "0.05em",
                        }}
                        title="Registration is closed for this section. Seats may still be available via d-clearance or waitlist."
                      >
                        CLOSED REG
                      </span>
                    )}
                  </span>
                </div>
                <div className="course-card-title">{sec.courseTitle}</div>
                {sec.section.topic && sec.section.topic !== sec.courseTitle && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#8C7E6A",
                      fontStyle: "italic",
                      marginBottom: 2,
                    }}
                  >
                    {sec.section.topic}
                  </div>
                )}
                <div className="course-card-meta">
                  <span>{instrName}</span>
                  <span>
                    {sec.section.registered}/{sec.section.capacity} seats
                  </span>
                </div>
              </div>
            );
          })}
          <a
            className="link-button"
            href="https://bia-roommate.vercel.app/course-planner"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", textAlign: "center", marginTop: 8 }}
          >
            Open full planner for more options →
          </a>
        </>
      )}
    </div>
  );
}
