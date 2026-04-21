/**
 * Course autocomplete: normalize queries so "PSYC 100" matches catalog "PSYC-100",
 * and parse suggestion rows whether or not the API includes a course title.
 */

export function normalizeCourseSearchKey(s: string): string {
  return s.toUpperCase().replace(/[\s\-]+/g, "");
}

export function courseMatchesQuery(
  fullCourseName: string | undefined,
  courseTitle: string | undefined,
  query: string,
): boolean {
  const q = query.trim();
  if (q.length < 2) return false;
  const uq = q.toUpperCase();
  const name = (fullCourseName || "").toUpperCase();
  const title = (courseTitle || "").toUpperCase();
  const blob = `${name} ${title}`;
  if (blob.includes(uq)) return true;
  const nq = normalizeCourseSearchKey(q);
  if (nq.length < 2) return false;
  return normalizeCourseSearchKey(blob).includes(nq);
}

export type ParsedSuggestion = {
  dept: string;
  number: string;
  label: string;
  title?: string;
};

/**
 * Parse a row from /api/courses/autocomplete (string or object with dept/number from USC).
 */
export function parseAutocompleteSuggestion(
  d: string | { text?: string; dept?: string; number?: string },
): ParsedSuggestion | null {
  if (typeof d !== "string" && d.dept && d.number) {
    const dept = d.dept.trim().toUpperCase();
    const number = d.number.trim();
    if (!dept || !number) return null;
    const text = (typeof d !== "string" ? d.text : "")?.trim() || "";
    const label = text || `${dept}-${number}`;
    const title = extractTitleAfterCode(label, dept, number);
    return { dept, number, label, title };
  }

  const text = typeof d === "string" ? d : d?.text || "";
  return parseSuggestionText(text);
}

function extractTitleAfterCode(
  text: string,
  dept: string,
  number: string,
): string | undefined {
  const hyphen = new RegExp(
    `^${escapeRe(dept)}-${escapeRe(number)}\\s+(.+)$`,
    "i",
  );
  const sp = new RegExp(
    `^${escapeRe(dept)}\\s+${escapeRe(number)}\\s+(.+)$`,
    "i",
  );
  return text.match(hyphen)?.[1]?.trim() || text.match(sp)?.[1]?.trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse catalog lines like "PSYC-100" or "PSYC 100 Title" (title optional). */
export function parseSuggestionText(text: string): ParsedSuggestion | null {
  const t = text.trim();
  if (!t) return null;

  let m = t.match(/^([A-Z]{2,10})-(\d+[A-Z0-9]*)(?:\s+(.*))?$/i);
  if (m) {
    return {
      dept: m[1].toUpperCase(),
      number: m[2],
      label: text,
      title: m[3]?.trim() || undefined,
    };
  }

  m = t.match(/^([A-Z]{2,10})\s+(\d+[A-Z0-9]*)(?:\s+(.*))?$/i);
  if (m) {
    return {
      dept: m[1].toUpperCase(),
      number: m[2],
      label: text,
      title: m[3]?.trim() || undefined,
    };
  }

  return null;
}

/**
 * User typed "PSYC 100", "PSYC-100", or "MPGU 120A" — navigate without dropdown.
 */
export function parseDirectCourseInput(input: string): {
  dept: string;
  number: string;
} | null {
  const s = input.trim();
  if (s.length < 4) return null;
  const m = s.match(/^([A-Z]{2,10})[\s-]+(\d+[A-Z0-9]*)\s*$/i);
  if (!m) return null;
  return { dept: m[1].toUpperCase(), number: m[2] };
}
