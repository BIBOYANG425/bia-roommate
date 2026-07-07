/**
 * 3-Layer Course Recommendation Agent (Paid / LLM mode)
 *
 * Layer 1: Interpreter — LLM parses natural language → dispatches instructions to research agents
 * Layer 2: Research Agents — Execute interpreter's instructions across USC catalog, RMP, Reddit
 * Layer 3: Recommender — LLM synthesizes all research into ranked recommendations
 *
 * Harness constraint: USC-only, course-related only. Rejects all other requests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Imports from extracted modules ───

import type {
  InterpretedQuery,
  ResearchedCourse,
  LLMConfig,
  SectionDetail,
  IntakeConstraints,
} from "./agent/types";
import {
  GE_API_MAP,
  validateInterpretedQuery,
  emptyIntakeConstraints,
} from "./agent/types";
import {
  getLLMConfig,
  getInterpreterConfig,
  callLLMWithRetry,
  extractJSON,
} from "./agent/llm-client";
import { sanitizeCommunityHighlights } from "./agent/sanitize";
import { SYSTEM_PROMPT_INTERPRETER, SYSTEM_PROMPT_RECOMMENDER } from "./prompts";
import { unitsMatch } from "./units";
import { filterByUnits, fetchGeCourses } from "./filters";

// ─── Re-exports for backward compatibility ───

export type { AgentRecommendation, AgentEvent } from "./agent/types";
export type { LLMConfig } from "./agent/types";

// ─── Layer 1: Interpreter ───

async function interpret(
  interestText: string,
  config: LLMConfig,
  _thinking: boolean = false,
  intake: IntakeConstraints = emptyIntakeConstraints(),
): Promise<{ query: InterpretedQuery; reasoning?: string }> {
  // Cap input length to prevent prompt injection / excessive token usage
  const sanitized = interestText.slice(0, 500).replace(/"/g, '\\"');
  const interpreterConfig = getInterpreterConfig() || config;

  // Inject UI-captured constraints into the interpreter context so its
  // inferred catalog/RMP instructions stay consistent with what the user
  // already told us through chips. We still merge UI values authoritatively
  // post-parse below — the prompt context is just a hint.
  const intakeHint = renderIntakeHint(intake);

  const result = await callLLMWithRetry(
    SYSTEM_PROMPT_INTERPRETER,
    `Student says: "${sanitized}"${intakeHint}`,
    interpreterConfig,
    {
      maxTokens: 1500,
      timeoutMs: 30000,
      thinking: false,
      retries: 1,
    },
  );

  const jsonStr = extractJSON(result.content, "object");
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse query interpretation as JSON");
  }
  const query = validateInterpretedQuery(raw);

  // UI constraints are authoritative — they came from explicit user clicks.
  // Override the LLM's inferences where UI provided a concrete value.
  mergeIntakeIntoQuery(query, intake);

  return { query, reasoning: result.reasoning };
}

function renderIntakeHint(intake: IntakeConstraints): string {
  const parts: string[] = [];
  if (intake.year) parts.push(`year=${intake.year}`);
  if (intake.geNeeded.length > 0)
    parts.push(`GE_needed=${intake.geNeeded.join(",")}`);
  if (intake.profRatingFloor !== null)
    parts.push(`min_prof_rating=${intake.profRatingFloor}`);
  if (parts.length === 0) return "";
  return `\n\nUI intake constraints (already locked by the student via the form — your inferences must respect these): ${parts.join("; ")}`;
}

function mergeIntakeIntoQuery(
  query: InterpretedQuery,
  intake: IntakeConstraints,
): void {
  query.studentConstraints = { ...intake };

  // GE chips override any GE category the LLM guessed at.
  if (intake.geNeeded.length > 0) {
    query.catalogInstructions.geCategories = [...intake.geNeeded];
  }

  // Prof rating floor seeds the RMP filter if the LLM didn't pick a stricter one.
  if (intake.profRatingFloor !== null) {
    const llmFloor = parseFloat(query.rmpInstructions.minimumRating);
    if (!Number.isFinite(llmFloor) || llmFloor < intake.profRatingFloor) {
      query.rmpInstructions.minimumRating = intake.profRatingFloor.toFixed(1);
    }
  }

  // Year goes into the student profile so the recommender can lean on it
  // (e.g. freshmen want GE-friendly courses; juniors care about prereqs).
  if (intake.year && !query.studentProfile.preferences.includes(intake.year)) {
    query.studentProfile.preferences.push(intake.year);
  }
}

// ─── Layer 2: Research Agents ───

// Year-aware course-level ceilings. A freshman seeing 400-level courses is
// almost always noise — they don't have prereqs and the recommender wastes
// tokens ranking them. Senior+ caps off at undergrad (≤499) to avoid grad
// seminars unless the student explicitly opted into "grad". Returns +Infinity
// for "no extra ceiling" so it composes with the existing courseLevel filter.
function yearCeiling(year: IntakeConstraints["year"]): number {
  switch (year) {
    case "freshman":
      return 400; // strictly below 400-level
    case "soph":
      return 500;
    case "junior":
    case "senior":
      return 600; // includes 500-level for ambitious undergrads
    case "grad":
    case null:
    default:
      return Infinity;
  }
}

// Agent 2a: USC Course Catalog — follows catalogInstructions
async function researchUSCCatalog(
  instructions: InterpretedQuery["catalogInstructions"],
  semester: string,
  baseUrl: string,
  year: IntakeConstraints["year"] = null,
): Promise<ResearchedCourse[]> {
  const courses: ResearchedCourse[] = [];
  const seen = new Set<string>();
  const yearCap = yearCeiling(year);

  const wantedUnits =
    instructions.unitsPreference !== "any"
      ? instructions.unitsPreference.replace(/[^0-9.]/g, "")
      : null;

  const levelStr = instructions.courseLevel.toLowerCase();
  const maxLevel =
    levelStr.includes("100") || levelStr.includes("intro")
      ? 200
      : levelStr.includes("200")
        ? 300
        : levelStr.includes("300") || levelStr.includes("intermediate")
          ? 400
          : 999;

  function shouldInclude(num: string, units: string): boolean {
    const numVal = parseInt(num, 10);
    if (maxLevel < 999 && numVal >= maxLevel) return false;
    // Year-aware ceiling: freshmen don't need 400-level shown, etc. Keeps the
    // recommender prompt focused and saves tokens on courses the student
    // either can't take (no prereqs) or shouldn't (grad seminars).
    if (Number.isFinite(numVal) && numVal >= yearCap) return false;
    // Compare units numerically — USC catalog sometimes returns "4.0" while
    // chip values are "4". String equality drops valid matches; unitsMatch
    // normalizes both sides via parseFloat.
    if (wantedUnits && units && !unitsMatch(units, wantedUnits)) return false;
    return true;
  }

  // Departments where each section is a distinct course topic
  const MULTI_TOPIC_DEPTS = new Set(["GESM", "WRIT"]);

  function formatSectionTime(schedule: any[]): string {
    if (!schedule || schedule.length === 0) return "TBA";
    return schedule
      .map((s: any) => {
        const day = s.dayCode || "TBA";
        const start = s.startTime || "";
        const end = s.endTime || "";
        if (!start) return day;
        return `${day} ${start}-${end}`;
      })
      .join(", ");
  }

  function addCourse(c: any, geTag?: string) {
    const dept = c.scheduledCourseCode?.prefix || c.department || "";
    const num =
      (c.scheduledCourseCode?.number || c.number || "") +
      (c.scheduledCourseCode?.suffix || "");
    const key = `${dept}-${num}`;
    const units = c.courseUnits?.[0]?.toString() || c.units || "";

    if (seen.has(key)) {
      const existing = courses.find(
        (x) => `${x.department}-${x.number}` === key,
      );
      if (existing) {
        if (geTag && !existing.geTag) existing.geTag = geTag;
        // Merge section data if the existing entry lacks it (GE API returns stubs without sections)
        const sections = c.sections || [];
        if (
          !existing.sections &&
          sections.length > 0 &&
          MULTI_TOPIC_DEPTS.has(dept)
        ) {
          const sectionDetails = sections
            .filter((s: any) => !s.isCancelled && s.name)
            .map((s: any) => {
              const instName = s.instructors?.[0]
                ? `${s.instructors[0].firstName} ${s.instructors[0].lastName}`
                : "TBA";
              return {
                sectionId: s.sisSectionId || s.id || "",
                topic: s.name as string,
                instructor: instName,
                days: s.schedule?.[0]?.dayCode || "TBA",
                time: formatSectionTime(s.schedule),
              };
            });
          if (sectionDetails.length > 0) existing.sections = sectionDetails;
          // Also merge instructors if missing
          if (existing.instructors.length === 0) {
            existing.instructors = sections
              .filter((s: any) => s.instructors?.[0]?.lastName)
              .map((s: any) => ({
                name: `${s.instructors[0].firstName} ${s.instructors[0].lastName}`,
              }))
              .filter(
                (inst: any, i: number, arr: any[]) =>
                  arr.findIndex((a: any) => a.name === inst.name) === i,
              );
          }
          // Merge section topics
          const topics: string[] = [
            ...new Set<string>(
              sections
                .filter((s: any) => !s.isCancelled && s.name)
                .map((s: any) => s.name as string),
            ),
          ];
          if (topics.length > 0) existing.sectionTopics = topics;
        }
      }
      return;
    }

    if (!shouldInclude(num, units)) return;

    seen.add(key);

    const sections = c.sections || [];
    const instructors = sections
      .filter((s: any) => s.instructors?.[0]?.lastName)
      .map((s: any) => ({
        name: `${s.instructors[0].firstName} ${s.instructors[0].lastName}`,
      }))
      .filter(
        (inst: any, i: number, arr: any[]) =>
          arr.findIndex((a: any) => a.name === inst.name) === i,
      );

    // Extract unique section topic names (e.g., WRIT 340 "for Engineers")
    const sectionTopics: string[] = [
      ...new Set<string>(
        sections
          .filter((s: any) => !s.isCancelled && s.name)
          .map((s: any) => s.name as string),
      ),
    ];

    // For GESM/WRIT: extract per-section details so the LLM recommends specific sections
    let sectionDetails: SectionDetail[] | undefined;
    if (MULTI_TOPIC_DEPTS.has(dept) && sectionTopics.length > 0) {
      sectionDetails = sections
        .filter((s: any) => !s.isCancelled && s.name)
        .map((s: any) => {
          const instName = s.instructors?.[0]
            ? `${s.instructors[0].firstName} ${s.instructors[0].lastName}`
            : "TBA";
          return {
            sectionId: s.sisSectionId || s.id || "",
            topic: s.name as string,
            instructor: instName,
            days: s.schedule?.[0]?.dayCode || "TBA",
            time: formatSectionTime(s.schedule),
          };
        });
    }

    courses.push({
      department: dept,
      number: num,
      title: c.name || c.fullCourseName || c.title || "",
      units,
      description: c.description || "",
      instructors,
      rmpHighlights: [],
      redditPosts: [],
      redditDataStatus: "fetched",
      geTag,
      sectionTopics: sectionTopics.length > 0 ? sectionTopics : undefined,
      sections: sectionDetails,
    });
  }

  // 1. Fetch by department
  const deptFetches = instructions.departments.slice(0, 8).map(async (dept) => {
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/CoursesForDepartment?termCode=${semester}&prefix=${dept}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.courses || data || []) as any[];
    } catch {
      return [];
    }
  });

  // 2. Search by terms
  const termFetches = instructions.searchTerms.slice(0, 5).map(async (term) => {
    try {
      const res = await fetch(
        `${baseUrl}/api/courses/search?q=${encodeURIComponent(term)}&semester=${semester}`,
      );
      if (!res.ok) return [];
      return (await res.json()) as any[];
    } catch {
      return [];
    }
  });

  // 3. Fetch specific GE categories
  const geFetches = instructions.geCategories.map(async (geCode) => {
    const mapping = GE_API_MAP[geCode];
    if (!mapping) return [];
    const geCourses = await fetchGeCourses(
      semester,
      mapping.req,
      mapping.cat,
      8000,
    );
    return geCourses.map((c: any) => ({ ...c, _geTag: geCode }));
  });

  const [deptResults, termResults, geResults] = await Promise.all([
    Promise.all(deptFetches),
    Promise.all(termFetches),
    Promise.all(geFetches),
  ]);

  for (const deptCourses of deptResults) {
    for (const c of deptCourses) addCourse(c);
  }
  for (const results of termResults) {
    for (const c of results) addCourse(c);
  }
  for (const geCourses of geResults) {
    for (const c of geCourses) addCourse(c, c._geTag);
  }

  // If filterNotes asks to only include a specific prefix (e.g., GESM), filter results
  const filterNotes = instructions.filterNotes?.toLowerCase() || "";
  if (filterNotes.includes("only include")) {
    const prefixTerms = instructions.searchTerms
      .filter((t) => /^[A-Z]{2,5}$/i.test(t))
      .map((t) => t.toUpperCase());
    if (prefixTerms.length > 0) {
      return courses.filter((c) => prefixTerms.includes(c.department));
    }
  }

  return courses;
}

// Agent 2b: RateMyProfessors — follows rmpInstructions
async function researchRMP(
  courses: ResearchedCourse[],
  instructions: InterpretedQuery["rmpInstructions"],
  baseUrl: string,
): Promise<void> {
  const allInstructors = new Set<string>();
  for (const c of courses) {
    for (const inst of c.instructors) {
      allInstructors.add(inst.name);
    }
  }

  const names = [...allInstructors].slice(0, 50);
  if (names.length === 0) return;

  try {
    const res = await fetch(
      `${baseUrl}/api/rmp/batch?names=${encodeURIComponent(names.join(","))}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return;
    const data = await res.json();
    const ratings = data.ratings || {};

    for (const c of courses) {
      for (const inst of c.instructors) {
        const rating = ratings[inst.name];
        if (rating) {
          inst.rating = rating.avgRating;
          inst.difficulty = rating.avgDifficulty;
          inst.numRatings = rating.numRatings;
          inst.wouldTakeAgain = rating.wouldTakeAgainPercent;
        }
      }
    }
  } catch {
    // RMP data is optional
  }

  const diffMatch = instructions.difficultyTarget.match(/([\d.]+)/);
  const maxDifficulty = diffMatch ? parseFloat(diffMatch[1]) : null;

  const ratingMatch = instructions.minimumRating.match(/([\d.]+)/);
  const minRating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  for (const c of courses) {
    let rmpFit = 0;
    for (const inst of c.instructors) {
      if (!inst.rating) continue;
      let fit = inst.rating;
      if (maxDifficulty && inst.difficulty && inst.difficulty <= maxDifficulty)
        fit += 1.0;
      if (minRating && inst.rating >= minRating) fit += 0.5;
      if (inst.wouldTakeAgain && inst.wouldTakeAgain > 70) fit += 0.5;
      rmpFit = Math.max(rmpFit, fit);
    }
    if (rmpFit > 0) {
      const bestProf = c.instructors
        .filter((i) => i.rating)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      if (bestProf) {
        const diffStr = bestProf.difficulty
          ? `, difficulty ${bestProf.difficulty}/5`
          : "";
        const wtaStr =
          bestProf.wouldTakeAgain && bestProf.wouldTakeAgain > 0
            ? `, ${bestProf.wouldTakeAgain}% would take again`
            : "";
        c.rmpHighlights.unshift(
          `Best prof: ${bestProf.name} — ${bestProf.rating}/5 RMP${diffStr}${wtaStr}`,
        );
      }
    }
  }
}

// Hard prof-rating floor. Applied AFTER researchRMP has enriched instructors,
// and ONLY when the user explicitly set a PROF BAR chip (intake.profRatingFloor).
// A course survives when its best-rated professor meets the floor. Courses with
// NO rated professor DROP: without a rating we can't prove they meet the bar,
// and keeping them would silently defeat a hard constraint the user asked for.
// When no floor is set, callers skip this and the soft RMP bonus in researchRMP
// stands.
function applyProfRatingFloor(
  courses: ResearchedCourse[],
  floor: number | null,
): ResearchedCourse[] {
  if (floor === null) return courses;
  return courses.filter((c) =>
    c.instructors.some(
      (i) => typeof i.rating === "number" && i.rating >= floor,
    ),
  );
}

// Agent 2d: Peer Ratings — fetches BIA course rating aggregates
async function researchPeerRatings(
  courses: ResearchedCourse[],
  baseUrl: string,
): Promise<void> {
  const courseKeys = courses
    .map((c) => `${c.department}-${c.number}`)
    .slice(0, 50);
  if (courseKeys.length === 0) return;

  try {
    const res = await fetch(
      `${baseUrl}/api/course-rating/aggregates?courses=${encodeURIComponent(courseKeys.join(","))}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return;
    const data = await res.json();
    const aggregates = data.aggregates || {};

    for (const c of courses) {
      const key = `${c.department}-${c.number}`;
      const agg = aggregates[key];
      if (agg && agg.review_count > 0) {
        c.peerRatings = {
          avgDifficulty: agg.avg_difficulty,
          avgWorkload: agg.avg_workload,
          avgGrading: agg.avg_grading,
          reviewCount: agg.review_count,
        };
      }
    }
  } catch {
    // Peer ratings are optional
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matcher for a course code in free Reddit text. Substring
// matching ("CSCI 100".includes("CSCI 10")) wrongly attaches a CSCI 100 post to
// CSCI 10, so we anchor on a leading word boundary and a trailing negative
// lookahead: the number must NOT be followed by another alphanumeric. Optional
// whitespace between prefix and number matches both "CSCI 100" and "CSCI100".
function buildCourseCodeMatcher(department: string, number: string): RegExp {
  const dept = escapeRegExp(department.trim());
  const num = escapeRegExp(number.trim());
  return new RegExp(`\\b${dept}\\s*${num}(?![0-9A-Za-z])`, "i");
}

// Agent 2c: Reddit — follows redditInstructions
//
// Anti-fabrication design: every entry in c.redditPosts carries an `url` that
// can be verified by the user. If Reddit fails, we set redditDataStatus to
// 'unavailable' so the recommender prompt can tell the LLM "no data" — without
// that signal, the LLM has historically synthesized plausible-sounding quotes.
async function researchReddit(
  courses: ResearchedCourse[],
  instructions: InterpretedQuery["redditInstructions"],
): Promise<void> {
  const queries = instructions.searchQueries.slice(0, 6);
  if (queries.length === 0) {
    for (const c of courses) c.redditDataStatus = "unavailable";
    return;
  }

  let anyQuerySucceeded = false;

  const searches = queries.map(async (term) => {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/USC/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&sort=relevance&limit=8`,
        {
          headers: { "User-Agent": "BIA-CourseAdvisor/1.0" },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        console.warn(
          `[agent] researchReddit: non-OK response ${res.status} for query "${term}"`,
        );
        return [];
      }
      anyQuerySucceeded = true;
      const data = await res.json();
      const posts = data?.data?.children || [];
      return posts.map((p: any) => {
        const permalink = p.data?.permalink || "";
        return {
          title: (p.data?.title as string) || "",
          selftext: ((p.data?.selftext as string) || "").slice(0, 500),
          score: (p.data?.score as number) || 0,
          numComments: (p.data?.num_comments as number) || 0,
          url: permalink ? `https://www.reddit.com${permalink}` : "",
        };
      });
    } catch (err) {
      console.warn(
        `[agent] researchReddit: query "${term}" threw`,
        (err as Error).message,
      );
      return [];
    }
  });

  const results = await Promise.all(searches);

  // Precompute one word-boundary matcher per course so we test each post
  // against a real regex (not a substring) — see buildCourseCodeMatcher.
  const matchers = courses.map((c) => ({
    course: c,
    re: buildCourseCodeMatcher(c.department, c.number),
  }));

  // Match posts to courses by word-boundary course-code presence in title/body.
  for (const posts of results) {
    for (const post of posts) {
      if (post.score < 1) continue;
      if (!post.url) continue; // never store an insight we can't link to
      const text = `${post.title} ${post.selftext}`;

      for (const { course: c, re } of matchers) {
        if (re.test(text)) {
          if (
            c.redditPosts.length < 4 &&
            !c.redditPosts.some((p) => p.url === post.url)
          ) {
            c.redditPosts.push({
              title: post.title.slice(0, 200),
              url: post.url,
              score: post.score,
            });
          }
        }
      }
    }
  }

  // Stamp each course's status:
  // - all queries failed → 'unavailable' (LLM should NOT cite Reddit)
  // - some queries returned data but this course got 0 matches → 'no_matches'
  // - matches found → 'fetched'
  //
  // We deliberately do NOT inject generic posts into unmatched courses anymore.
  // That fallback (previous behavior) was the main "Reddit quote feels random"
  // failure mode: a post mentioning topic X got attached to course Y because
  // it shared a keyword in `instructions.lookFor`.
  for (const c of courses) {
    if (!anyQuerySucceeded) c.redditDataStatus = "unavailable";
    else if (c.redditPosts.length === 0) c.redditDataStatus = "no_matches";
    else c.redditDataStatus = "fetched";
  }
}

// ─── Layer 3: Recommender ───

/** Max courses the recommender LLM sees in one prompt. Keeps token cost
 *  predictable. When the catalog returns more than this, the overflow is
 *  surfaced via research_done's `total` field so the UI can tell the user
 *  "we ranked the top N of M candidates" instead of silently dropping them. */
export const RECOMMENDER_INPUT_CAP = 40;

async function recommend(
  interestText: string,
  query: InterpretedQuery,
  courses: ResearchedCourse[],
  config: LLMConfig,
  thinking: boolean = false,
): Promise<{
  recommendations: import("./agent/types").AgentRecommendation[];
  reasoning?: string;
}> {
  const courseSummaries = courses.slice(0, RECOMMENDER_INPUT_CAP).map((c) => {
    const parts = [
      `${c.department} ${c.number}: ${c.title} (${c.units} units)`,
    ];
    if (c.description) parts.push(`  Desc: ${c.description.slice(0, 120)}`);
    if (c.geTag) parts.push(`  GE: ${c.geTag}`);

    // For GESM/WRIT: show each section as a distinct option with time + instructor
    if (c.sections && c.sections.length > 0) {
      parts.push(
        `  *** MULTI-TOPIC COURSE — recommend SPECIFIC SECTIONS below, not the course itself ***`,
      );
      for (const sec of c.sections.slice(0, 10)) {
        const rmpData = c.instructors.find((i) => i.name === sec.instructor);
        const rmpStr = rmpData?.rating ? ` (${rmpData.rating}/5 RMP)` : "";
        parts.push(
          `  SECTION [${sec.sectionId}] "${sec.topic}" — ${sec.time}, ${sec.instructor}${rmpStr}`,
        );
      }
    } else if (c.sectionTopics && c.sectionTopics.length > 0) {
      parts.push(`  Section topics: ${c.sectionTopics.join(", ")}`);
    }

    for (const inst of c.instructors.slice(0, 2)) {
      const rmpParts: string[] = [];
      if (inst.rating) rmpParts.push(`${inst.rating}/5`);
      if (inst.difficulty) rmpParts.push(`diff ${inst.difficulty}/5`);
      if (inst.wouldTakeAgain && inst.wouldTakeAgain > 0)
        rmpParts.push(`${inst.wouldTakeAgain}% again`);
      const rmpStr = rmpParts.length > 0 ? ` (${rmpParts.join(", ")})` : "";
      parts.push(`  Prof: ${inst.name}${rmpStr}`);
    }
    // RMP "Best prof: ..." one-liners live in rmpHighlights (NOT Reddit).
    // We label them explicitly so the recommender can't accidentally tag them as Reddit.
    for (const insight of c.rmpHighlights.slice(0, 2)) {
      parts.push(`  RMP highlight: "${insight.slice(0, 120)}"`);
    }
    // Reddit posts: only emit when we actually have data with verifiable URLs.
    // The unavailable / no_matches markers tell the LLM "do not cite Reddit here".
    if (c.redditDataStatus === "unavailable") {
      parts.push(`  Reddit: (data unavailable for this query)`);
    } else if (c.redditDataStatus === "no_matches") {
      parts.push(`  Reddit: (no posts mentioning this course found)`);
    } else {
      for (const post of c.redditPosts.slice(0, 2)) {
        parts.push(
          `  Reddit: [${post.url}] "${post.title.slice(0, 150)}"`,
        );
      }
    }
    if (c.peerRatings && c.peerRatings.reviewCount > 0) {
      parts.push(
        `  Peer ratings (${c.peerRatings.reviewCount} student reviews): difficulty ${c.peerRatings.avgDifficulty}/5, workload ${c.peerRatings.avgWorkload}/5, grading ${c.peerRatings.avgGrading}/5`,
      );
    }
    return parts.join("\n");
  });

  const profile = query.studentProfile;
  // Defense in depth: even though the SSE route caps interests to 500 chars,
  // recommend() is also reachable via runAgent(). Cap again so an oversized
  // interests string can never bloat the recommender prompt.
  const cappedInterest = interestText.slice(0, 500);
  const userMessage = `STUDENT INPUT: "${cappedInterest}"

INTERPRETER ANALYSIS:
- Interests: ${profile.interests.join(", ") || "general"}
- Preferences: ${profile.preferences.join(", ") || "none specified"}
- Dealbreakers: ${profile.dealbreakers.join(", ") || "none"}
- RMP focus: ${query.rmpInstructions.prioritize}
- Wanted units: ${query.catalogInstructions.unitsPreference}
- Wanted GE: ${query.catalogInstructions.geCategories.join(", ") || "none"}
- Wanted level: ${query.catalogInstructions.courseLevel}

RESEARCH DATA (${courseSummaries.length} courses found):

${courseSummaries.join("\n\n")}`;

  const result = await callLLMWithRetry(
    SYSTEM_PROMPT_RECOMMENDER,
    userMessage,
    config,
    {
      maxTokens: 4000,
      timeoutMs: 60000,
      thinking,
      retries: 1,
    },
  );

  const jsonStr = extractJSON(result.content, "array");
  let ranked: any[];
  try {
    ranked = JSON.parse(jsonStr) as any[];
  } catch {
    // Detect mid-stream truncation by looking for an unterminated last
    // recommendation. The LLM hit max_tokens before closing the JSON array.
    // Surface this distinctly so the UI can suggest "narrow your query"
    // instead of a generic failure.
    const looksTruncated =
      jsonStr.includes("{") && !jsonStr.trim().endsWith("]");
    throw new Error(
      looksTruncated
        ? "Recommender output was truncated before completing the recommendation list — try a more specific query."
        : "Recommender returned malformed JSON — this is usually transient, please retry.",
    );
  }

  const recommendations = ranked.slice(0, 15).map((rec: any) => {
    const courseData = courses.find(
      (c) => c.department === rec.department && c.number === rec.number,
    );

    const topInstructor = courseData?.instructors
      .filter((i) => i.rating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];

    // For section-level recommendations (GESM/WRIT), use section topic as title
    const isSection = !!rec.sectionId;
    const displayTitle =
      isSection && rec.sectionTopic
        ? rec.sectionTopic
        : courseData?.title || "";

    const safeHighlights = sanitizeCommunityHighlights(
      rec.communityHighlights,
      courseData,
    );

    return {
      department: rec.department,
      number: rec.number,
      title: displayTitle,
      units: courseData?.units || "",
      description: courseData?.description || "",
      relevanceScore: rec.relevanceScore || 0,
      matchReasons: rec.matchReasons || [],
      geTag: courseData?.geTag,
      topInstructor: topInstructor?.rating
        ? { name: topInstructor.name, rating: topInstructor.rating }
        : undefined,
      suggestedInstructor: rec.suggestedInstructor || undefined,
      communityHighlights: safeHighlights,
      aiReasoning: rec.aiReasoning || "",
      sectionTopics: courseData?.sectionTopics,
      sectionId: rec.sectionId || undefined,
      sectionTopic: rec.sectionTopic || undefined,
      sectionTime: rec.sectionTime || undefined,
      sectionInstructor: rec.sectionInstructor || undefined,
    };
  });

  return { recommendations, reasoning: result.reasoning };
}

// ─── Orchestrator ───

/**
 * Non-streaming orchestrator. Thin wrapper over `runAgentStreaming` with a
 * collecting emitter — the two ran the same 3-layer pipeline but had drifted
 * (units filter, error handling), so there is now a single source of truth.
 *
 * The collector maps the streaming event set back onto runAgent's original
 * `{ recommendations, mode } | { error, isRejection? }` contract, preserving the
 * behavior the recommend route pins:
 *   - `results`       → { recommendations, mode: "agent" }
 *   - `error`         → { error, isRejection? }         (route → free-mode fallback)
 *   - `no_results`    → { recommendations: [], mode: "agent" }  (units/final empty
 *                        were an empty-but-successful agent response, NOT an error;
 *                        the route returns them 200, it does NOT fall to free mode)
 *   - `clarification` → { error: "No courses found matching your criteria." }
 *                        (the old runAgent had no clarification gate: a vague query
 *                        fell through to an empty catalog and returned exactly this
 *                        error, so the route still falls to free mode as before)
 * Progress events (thinking/reasoning/interpreted/researching/…) are ignored.
 * thinking is forced false to match the old runAgent (it never enabled it).
 */
export async function runAgent(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter?: string,
  intake: IntakeConstraints = emptyIntakeConstraints(),
): Promise<
  | {
      recommendations: import("./agent/types").AgentRecommendation[];
      mode: "agent";
    }
  | { error: string; isRejection?: boolean }
> {
  let recommendations:
    | import("./agent/types").AgentRecommendation[]
    | null = null;
  let error: { error: string; isRejection?: boolean } | null = null;

  const emit = (event: import("./agent/types").AgentEvent) => {
    switch (event.type) {
      case "results":
        recommendations = event.data;
        break;
      case "error":
        error = event.isRejection
          ? { error: event.message, isRejection: true }
          : { error: event.message };
        break;
      case "no_results":
        // Empty-but-successful agent result (units/final-empty). The old
        // runAgent returned { recommendations: [], mode: "agent" } here.
        recommendations = [];
        break;
      case "clarification":
        // Old runAgent had no clarification gate; a vague query produced an
        // empty catalog and this exact error. Preserve it so the route's
        // free-mode fallback is unchanged.
        error = { error: "No courses found matching your criteria." };
        break;
      // Progress events carry no return value — ignore.
    }
  };

  await runAgentStreaming(
    interestText,
    semester,
    baseUrl,
    unitsFilter,
    false,
    emit,
    intake,
  );

  if (error) return error;
  if (recommendations) return { recommendations, mode: "agent" };
  // Streaming always ends on a terminal event; this is unreachable in practice.
  return { error: "No courses found matching your criteria." };
}

// ─── Streaming Orchestrator (emits events as agent works) ───

export async function runAgentStreaming(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter: string | undefined,
  thinking: boolean,
  emit: (event: import("./agent/types").AgentEvent) => void,
  intake: IntakeConstraints = emptyIntakeConstraints(),
): Promise<void> {
  const config = getLLMConfig();
  if (!config) {
    emit({ type: "error", message: "No LLM API key configured" });
    return;
  }

  emit({
    type: "thinking",
    message: `Understanding your request: "${interestText}"`,
  });

  let query: InterpretedQuery;
  try {
    const interpreted = await interpret(interestText, config, thinking, intake);
    query = interpreted.query;
    if (interpreted.reasoning) {
      emit({
        type: "reasoning",
        step: "interpreter",
        content: interpreted.reasoning,
      });
    }
  } catch (err) {
    emit({
      type: "error",
      message: `Failed to interpret request: ${(err as Error).message}`,
    });
    return;
  }

  if (!query.isValid) {
    emit({
      type: "error",
      message:
        query.rejection || "I can only help with USC course-related questions.",
      isRejection: true,
    });
    return;
  }

  // Phase 2.3 clarification gate. When the interpreter judges the input
  // ambiguous, emit a chip-row question to the UI and stop — researchers
  // wouldn't produce anything useful from "what should I take" anyway.
  if (
    query.needsClarification &&
    query.clarifyingQuestions &&
    query.clarifyingQuestions.length > 0
  ) {
    emit({
      type: "clarification",
      questions: query.clarifyingQuestions,
    });
    return;
  }

  const profile = query.studentProfile;
  emit({
    type: "interpreted",
    data: {
      interests: profile.interests,
      preferences: profile.preferences,
      dealbreakers: profile.dealbreakers,
      departments: query.catalogInstructions.departments,
      geCategories: query.catalogInstructions.geCategories,
    },
  });

  const deptStr =
    query.catalogInstructions.departments.slice(0, 5).join(", ") || "all";
  const geStr =
    query.catalogInstructions.geCategories.length > 0
      ? ` + ${query.catalogInstructions.geCategories.join(", ")}`
      : "";
  emit({
    type: "researching",
    source: "catalog",
    message: `Searching USC catalog: ${deptStr}${geStr} departments...`,
  });

  let catalogCourses: ResearchedCourse[];
  try {
    catalogCourses = await researchUSCCatalog(
      query.catalogInstructions,
      semester,
      baseUrl,
      query.studentConstraints.year,
    );
  } catch (err) {
    emit({
      type: "error",
      message: `Catalog search failed: ${(err as Error).message}`,
    });
    return;
  }

  if (catalogCourses.length === 0) {
    emit({
      type: "error",
      message:
        "No courses found matching your criteria. Try broader interests.",
    });
    return;
  }

  const submitted = Math.min(catalogCourses.length, RECOMMENDER_INPUT_CAP);
  const overflowNote =
    catalogCourses.length > RECOMMENDER_INPUT_CAP
      ? ` (ranking top ${submitted})`
      : "";
  emit({
    type: "research_done",
    source: "catalog",
    message: `Found ${catalogCourses.length} candidate courses${overflowNote}`,
    submitted,
    total: catalogCourses.length,
  });

  emit({
    type: "researching",
    source: "rmp",
    message: `Checking professor ratings for ${Math.min(
      catalogCourses.reduce((n, c) => n + c.instructors.length, 0),
      50,
    )} instructors...`,
  });
  emit({
    type: "researching",
    source: "reddit",
    message: `Searching r/USC for student discussions: ${query.redditInstructions.searchQueries
      .slice(0, 3)
      .map((q) => `"${q}"`)
      .join(", ")}...`,
  });

  await Promise.all([
    researchRMP(catalogCourses, query.rmpInstructions, baseUrl).then(() => {
      const withRating = catalogCourses.filter((c) =>
        c.instructors.some((i) => i.rating),
      );
      emit({
        type: "research_done",
        source: "rmp",
        message: `${withRating.length} courses have rated professors`,
      });
    }),
    researchReddit(catalogCourses, query.redditInstructions).then(() => {
      const withPosts = catalogCourses.filter(
        (c) => c.redditPosts.length > 0,
      );
      const allUnavailable = catalogCourses.every(
        (c) => c.redditDataStatus === "unavailable",
      );
      emit({
        type: "research_done",
        source: "reddit",
        message: allUnavailable
          ? "Reddit unavailable — recommendations will not cite community posts"
          : `${withPosts.length} courses have student discussions on r/USC`,
      });
    }),
    researchPeerRatings(catalogCourses, baseUrl),
  ]);

  // Hard prof-rating floor (only when the user set the PROF BAR chip). If it
  // wipes out every candidate, surface an explicit empty state instead of
  // handing the recommender an empty list.
  if (query.studentConstraints.profRatingFloor !== null) {
    catalogCourses = applyProfRatingFloor(
      catalogCourses,
      query.studentConstraints.profRatingFloor,
    );
    if (catalogCourses.length === 0) {
      emit({
        type: "no_results",
        message: `No courses have a professor rated ${query.studentConstraints.profRatingFloor.toFixed(
          1,
        )}+ on RateMyProfessors. Try lowering the PROF BAR filter.`,
      });
      return;
    }
  }

  emit({
    type: "recommending",
    message:
      "Ranking courses based on your preferences, professor quality, and community feedback...",
  });

  let recommendations: import("./agent/types").AgentRecommendation[];
  try {
    const recResult = await recommend(
      interestText,
      query,
      catalogCourses,
      config,
      thinking,
    );
    recommendations = recResult.recommendations;
    if (recResult.reasoning) {
      emit({
        type: "reasoning",
        step: "recommender",
        content: recResult.reasoning,
      });
    }
  } catch (err) {
    // Pass through the recommender's already-distinguished message (truncated
    // vs malformed JSON vs upstream timeout) rather than wrapping it in a
    // generic "Recommendation failed:" prefix that buried the real signal.
    const raw = (err as Error).message || "Unknown error";
    emit({
      type: "error",
      message: raw,
    });
    return;
  }

  if (unitsFilter) {
    // r.units is set from the same catalogCourses lookup inside recommend(), so
    // filtering the recommendations by their own units is equivalent to the old
    // per-rec catalog lookup — one shared filterByUnits, built on unitsMatch.
    const filtered = filterByUnits(recommendations, unitsFilter);
    // The units chip emptied a non-empty ranking → explicit empty state so the
    // UI can say "loosen your filters" instead of hanging on loading dots.
    if (filtered.length === 0 && recommendations.length > 0) {
      emit({
        type: "no_results",
        message: `None of the ranked courses are ${unitsFilter} units. Try a different UNITS filter.`,
      });
      return;
    }
    recommendations = filtered;
  }

  if (recommendations.length === 0) {
    emit({
      type: "no_results",
      message:
        "The AI didn't find strong matches for that. Try broadening your interests or loosening your filters.",
    });
    return;
  }

  emit({ type: "results", data: recommendations });
}

// Internal helpers exposed for unit tests only. Do NOT import from app code.
export const __test = {
  researchReddit,
  recommend,
  interpret,
  researchUSCCatalog,
  researchRMP,
  researchPeerRatings,
  yearCeiling,
  applyProfRatingFloor,
  buildCourseCodeMatcher,
  RECOMMENDER_INPUT_CAP,
};
