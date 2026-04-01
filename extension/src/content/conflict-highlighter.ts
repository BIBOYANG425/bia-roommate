// Highlights sections that have time conflicts with each other on WebReg

const CONFLICT_ATTR = "data-bia-conflict";

interface TimeSlot {
  day: string;
  startMin: number;
  endMin: number;
}

interface SectionInfo {
  element: HTMLElement;
  courseId: string;
  slots: TimeSlot[];
}

function getCellText(cell: HTMLElement): string {
  const clone = cell.cloneNode(true) as HTMLElement;
  const labels = clone.querySelectorAll(".table-headers-xsmall");
  for (const label of labels) label.remove();
  return clone.textContent?.trim() || "";
}

function parseTimeRange(
  timeStr: string,
): { startMin: number; endMin: number } | null {
  // Handles "10:00-11:50am", "2:00-3:20pm", "10:00AM-11:50AM"
  const match = timeStr.match(
    /(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  );
  if (!match) return null;

  let startH = parseInt(match[1], 10);
  const startM = parseInt(match[2], 10);
  let endH = parseInt(match[4], 10);
  const endM = parseInt(match[5], 10);
  const endAmPm = (match[6] || match[3] || "").toLowerCase();

  // Apply AM/PM — if end is PM and < 12, add 12
  if (endAmPm === "pm" && endH < 12) endH += 12;
  // If start is in the same half-day as end
  if (endAmPm === "pm" && startH < 12 && startH + 12 <= endH) startH += 12;

  return { startMin: startH * 60 + startM, endMin: endH * 60 + endM };
}

const DAY_MAP: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  H: "Thu",
  F: "Fri",
};

function parseDays(dayStr: string): string[] {
  const days: string[] = [];
  for (const char of dayStr.toUpperCase()) {
    const mapped = DAY_MAP[char];
    if (mapped) days.push(mapped);
  }
  return days;
}

// Build map: content area element → course ID (from course headers)
function buildCourseMap(): Map<HTMLElement, string> {
  const map = new Map<HTMLElement, string>();
  const courseHeaders =
    document.querySelectorAll<HTMLElement>(".course-header");

  for (const header of courseHeaders) {
    const crsIdEl = header.querySelector(".crsID");
    const text = crsIdEl?.textContent?.trim() || "";
    const match = text.match(/([A-Z]{2,5})[-\s](\d{3}[A-Z]?)/);
    if (!match) continue;
    const courseId = `${match[1]}-${match[2]}`;

    const targetId =
      header.getAttribute("href") ||
      header.querySelector("a")?.getAttribute("href");
    if (!targetId) continue;
    const cleanId = targetId.replace(/^#/, "");
    const contentArea = document.getElementById(cleanId);
    if (contentArea) {
      map.set(contentArea, courseId);
    }
  }

  return map;
}

// Walk up from section element to find which course content area it's in
function findCourseId(
  el: HTMLElement,
  courseMap: Map<HTMLElement, string>,
): string | null {
  let current: HTMLElement | null = el;
  while (current) {
    if (courseMap.has(current)) return courseMap.get(current)!;
    current = current.parentElement;
  }
  return null;
}

// Extract time/day info from a section container's cells
function extractSectionSlots(sectionEl: HTMLElement): TimeSlot[] {
  const cells = sectionEl.querySelectorAll<HTMLElement>(".section_row");
  let timeText = "";
  let dayText = "";

  for (const cell of cells) {
    const label = cell.querySelector(".table-headers-xsmall");
    if (!label) continue;
    const labelText = label.textContent?.trim().toLowerCase() || "";
    const cellText = getCellText(cell);

    if (labelText.includes("time")) timeText = cellText;
    if (labelText.includes("day")) dayText = cellText;
  }

  // Sometimes day letters are embedded in the time string
  if (!dayText && timeText) {
    const dayMatch = timeText.match(/[MTWHF]+/i);
    if (dayMatch) dayText = dayMatch[0];
  }

  if (!timeText || !dayText) return [];
  if (dayText.toUpperCase() === "TBA" || timeText.toUpperCase() === "TBA")
    return [];

  const time = parseTimeRange(timeText);
  if (!time) return [];

  return parseDays(dayText).map((day) => ({ day, ...time }));
}

function slotsConflict(a: TimeSlot, b: TimeSlot): boolean {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
}

export function clearConflictHighlights() {
  const highlighted = document.querySelectorAll<HTMLElement>(
    ".bia-conflict-highlight",
  );
  for (const el of highlighted) {
    el.classList.remove("bia-conflict-highlight");
    el.removeAttribute(CONFLICT_ATTR);
    el.title = "";
  }
}

export function highlightConflicts() {
  // Clear stale highlights before re-evaluating
  clearConflictHighlights();

  const courseMap = buildCourseMap();
  if (courseMap.size === 0) return;

  const sections: SectionInfo[] = [];

  // Each .section_crsbin is one section row
  const sectionEls = document.querySelectorAll<HTMLElement>(".section_crsbin");

  for (const sectionEl of sectionEls) {
    const courseId = findCourseId(sectionEl, courseMap);
    if (!courseId) continue;

    const slots = extractSectionSlots(sectionEl);
    if (slots.length === 0) continue;

    sections.push({ element: sectionEl, courseId, slots });
  }

  if (sections.length < 2) return;

  // Compare all pairs from different courses
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (sections[i].courseId === sections[j].courseId) continue;

      const hasConflict = sections[i].slots.some((a) =>
        sections[j].slots.some((b) => slotsConflict(a, b)),
      );

      if (hasConflict) {
        for (const [el, conflictId] of [
          [sections[i].element, sections[j].courseId],
          [sections[j].element, sections[i].courseId],
        ] as [HTMLElement, string][]) {
          el.classList.add("bia-conflict-highlight");
          el.setAttribute(CONFLICT_ATTR, "true");
          const existing = el.title;
          if (!existing) {
            el.title = `Time conflict with ${conflictId}`;
          } else if (!existing.includes(conflictId)) {
            el.title = `${existing}, ${conflictId}`;
          }
        }
      }
    }
  }

  // Also store enrolled slots for cross-page conflict detection
  const storedSlots = sections.map((s) => ({
    courseId: s.courseId,
    slots: s.slots,
  }));
  chrome.storage.session.set({ enrolledSlots: storedSlots }).catch(() => {});
}
