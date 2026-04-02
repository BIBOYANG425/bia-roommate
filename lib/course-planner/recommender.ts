import {
  tokenize,
  tokenizeRaw,
  tokenMatchScore,
  getDepartmentMatches,
} from "./interest-map";
import { GE_MAP } from "./ge-map";

export interface RecommendedCourse {
  department: string;
  number: string;
  title: string;
  units: string;
  description: string;
  relevanceScore: number;
  matchReasons: string[];
  geTag?: string;
  sectionTopics?: string[];
}

interface AutocompleteCourse {
  fullCourseName: string;
  name: string;
  prefix: string;
  scheduledCourseCode: {
    prefix: string;
    number: string;
    suffix: string;
    courseSmashed: string;
  };
  courseUnits: number[] | null;
  classNumber: string;
}

// ─── Tier 1: Score using only name + department (no API calls) ───
function scoreTier1(
  course: AutocompleteCourse,
  tokens: string[],
  matchedDepts: Set<string>,
): { score: number; matched: string[] } {
  const title = course.name || "";
  const dept = course.scheduledCourseCode?.prefix || course.prefix || "";
  const num = parseInt(
    course.classNumber || course.scheduledCourseCode?.number || "999",
    10,
  );

  // Title keyword match (strongest signal)
  const titleResult = tokenMatchScore(tokens, title);

  // Also check against full course name (e.g., "CSCI 201")
  const fullNameResult = tokenMatchScore(tokens, course.fullCourseName || "");

  const bestTitleScore = Math.max(titleResult.score, fullNameResult.score);
  const allMatched = [
    ...new Set([...titleResult.matched, ...fullNameResult.matched]),
  ];

  // Department relevance
  const deptScore = matchedDepts.has(dept) ? 1.0 : 0;

  // Boost: multiple keyword matches in the title are worth more than proportional
  const multiMatchBonus = allMatched.length >= 2 ? allMatched.length * 0.5 : 0;

  // Freshman-level bonus (100-200 level courses)
  const freshmanBonus = num < 300 ? 0.5 : num < 500 ? 0.2 : 0;

  const score =
    bestTitleScore * 3.0 + deptScore * 2.0 + freshmanBonus + multiMatchBonus;

  return { score, matched: allMatched };
}

// ─── Tier 2: Score with full description + section topics ───
function scoreTier2(
  title: string,
  description: string,
  dept: string,
  courseNumber: string,
  tokens: string[],
  matchedDepts: Set<string>,
  geTag?: string,
  sectionTopics?: string[],
  rawTokens?: string[],
): { score: number; matched: string[]; matchedTopic?: string } {
  const num = parseInt(courseNumber || "999", 10);

  // Description keyword match (best signal when available)
  const descResult = description
    ? tokenMatchScore(tokens, description)
    : { score: 0, matched: [] as string[] };

  // Title keyword match
  const titleResult = tokenMatchScore(tokens, title);

  // Section topic matching — use raw tokens (no synonym expansion) to avoid
  // diluting the match ratio. E.g., "natural science writing" should be 3/3 = 1.0
  // against "Advanced Writing for Natural Sciences", not 3/7 after expansion.
  let topicBonus = 0;
  let topicMatched: string[] = [];
  let bestTopic: string | undefined;
  const topicTokens = rawTokens || tokens;
  if (sectionTopics && sectionTopics.length > 0) {
    for (const topic of sectionTopics) {
      const topicResult = tokenMatchScore(topicTokens, topic);
      if (topicResult.score > topicBonus) {
        topicBonus = topicResult.score;
        topicMatched = topicResult.matched;
        bestTopic = topic;
      }
    }
  }

  // Department relevance
  const deptScore = matchedDepts.has(dept) ? 1.0 : 0;

  // GE fulfillment bonus (freshmen need GEs)
  const geBonus = geTag ? 2.5 : 0;

  // Freshman-level bonus
  const freshmanBonus = num < 300 ? 0.5 : num < 500 ? 0.2 : 0;

  const score =
    descResult.score * 4.0 +
    titleResult.score * 3.0 +
    topicBonus * 3.5 +
    deptScore * 2.0 +
    geBonus +
    freshmanBonus;

  const allMatched = [
    ...new Set([
      ...descResult.matched,
      ...titleResult.matched,
      ...topicMatched,
    ]),
  ];

  return { score, matched: allMatched, matchedTopic: bestTopic };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Extract unique section topic names from API sections array ───
function extractSectionTopics(sections: any[]): string[] {
  return [
    ...new Set(
      sections
        .filter((s: any) => !s.isCancelled && s.name)
        .map((s: any) => s.name as string),
    ),
  ];
}

// ─── Format match reasons into human-readable labels ───
// Tokens that shouldn't appear as match reasons (GE codes, stems, generic words)
const REASON_FILTER = new Set([
  "ge",
  "ge-a",
  "ge-b",
  "ge-c",
  "ge-d",
  "ge-e",
  "ge-f",
  "ge-g",
  "ge-h",
  "usc",
  "intro",
  "introduct",
  "introductori",
  "level",
  "requir",
]);

function formatMatchReasons(
  rawMatched: string[],
  dept: string,
  matchedDepts: Set<string>,
  geTag?: string,
  matchedTopic?: string,
): string[] {
  const reasons: string[] = [];

  // Add matched section topic as a reason (most specific signal)
  if (matchedTopic) reasons.push(`"${matchedTopic}" section`);

  // Add GE tag as a reason
  if (geTag) reasons.push(`Fulfills ${geTag}`);

  // Add department match
  if (matchedDepts.has(dept)) reasons.push(`${dept} department`);

  // Capitalize and deduplicate raw keyword matches, filtering very short/generic ones
  for (const r of rawMatched) {
    if (r.length < 3) continue;
    if (REASON_FILTER.has(r.toLowerCase())) continue;
    const capitalized = r.charAt(0).toUpperCase() + r.slice(1);
    if (
      !reasons.some(
        (existing) => existing.toLowerCase() === capitalized.toLowerCase(),
      )
    ) {
      reasons.push(capitalized);
    }
  }

  return reasons.slice(0, 5);
}

// ─── Main recommendation engine (runs server-side) ───
export async function getRecommendations(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter?: string,
): Promise<RecommendedCourse[]> {
  const tokens = tokenize(interestText);
  if (tokens.length === 0) return [];
  const rawTokens = tokenizeRaw(interestText);

  const matchedDepts = getDepartmentMatches(tokens);

  // ── Tier 1: Score all courses from autocomplete cache ──
  const autoRes = await fetch(
    `${baseUrl}/api/courses/autocomplete?q=&termCode=${semester}&all=true`,
  );
  const autoCourses: AutocompleteCourse[] = autoRes.ok
    ? (await autoRes.json()).courses || []
    : [];

  const tier1Scored = autoCourses
    .map((c) => {
      const { score, matched } = scoreTier1(c, tokens, matchedDepts);
      return { course: c, score, matched };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Courses with section-level topic variation that need Tier 2 regardless of Tier 1 rank.
  // These have distinct section topics (e.g., WRIT 340 "for Publishing" vs "for Natural Science")
  // that can only be matched once we fetch full course details.
  const MULTI_TOPIC_PREFIXES = new Set(["WRIT", "GESM"]);
  const top30Set = new Set(
    tier1Scored
      .slice(0, 30)
      .map((x) => x.course.scheduledCourseCode.courseSmashed),
  );
  const multiTopicExtra = autoCourses
    .filter((c) => {
      const prefix = c.scheduledCourseCode?.prefix || c.prefix || "";
      return (
        MULTI_TOPIC_PREFIXES.has(prefix) &&
        !top30Set.has(c.scheduledCourseCode.courseSmashed)
      );
    })
    .slice(0, 15)
    .map((c) => ({ course: c, score: 0, matched: [] as string[] }));

  const tier2Candidates = [...tier1Scored.slice(0, 30), ...multiTopicExtra];

  // ── Tier 2: Fetch details for top candidates + multi-topic courses + all GE categories ──
  const detailPromises = tier2Candidates.map(async (item) => {
    const code = item.course.scheduledCourseCode;
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/Course?termCode=${semester}&courseCode=${code.courseSmashed}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) return null;
      const data = await res.json();

      // Skip courses with no active scheduled sections
      const sections: any[] = data.sections || [];
      const hasActive = sections.some(
        (s: any) =>
          !s.isCancelled && s.schedule?.some((sch: any) => sch.startTime),
      );
      if (!hasActive) return null;

      return {
        department: code.prefix,
        number: code.number + (code.suffix || ""),
        title: data.name || data.fullCourseName || item.course.name || "",
        description: data.description || "",
        units: data.courseUnits?.[0]?.toString() || "",
        tier1Matched: item.matched,
        sectionTopics: extractSectionTopics(sections),
      };
    } catch {
      return null;
    }
  });

  const gePromises = Object.entries(GE_MAP).map(
    async ([geCode, { requirementPrefix, categoryPrefix }]) => {
      try {
        const res = await fetch(
          `https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode=${semester}&geRequirementPrefix=${requirementPrefix}&categoryPrefix=${categoryPrefix}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return [];
        const data = await res.json();
        const courses = data.courses || [];
        return courses
          .filter((c: any) =>
            c.sections?.some(
              (s: any) =>
                !s.isCancelled && s.schedule?.some((sch: any) => sch.startTime),
            ),
          )
          .map((c: any) => ({
            department: c.scheduledCourseCode?.prefix || "",
            number:
              (c.scheduledCourseCode?.number || "") +
              (c.scheduledCourseCode?.suffix || ""),
            title: c.name || c.fullCourseName || "",
            description: c.description || "",
            units: c.courseUnits?.[0]?.toString() || "",
            geTag: geCode,
            sectionTopics: extractSectionTopics(c.sections || []),
          }));
      } catch {
        return [];
      }
    },
  );

  const [detailResults, ...geResults] = await Promise.all([
    Promise.all(detailPromises),
    ...gePromises,
  ]);

  // ── Score all Tier 2 candidates (Map-based dedupe to merge GE tags) ──
  const scoreMap = new Map<string, RecommendedCourse>();

  // Score top-30 detail-fetched courses
  for (const detail of detailResults) {
    if (!detail) continue;
    const key = `${detail.department}-${detail.number}`;
    if (scoreMap.has(key)) continue;

    const { score, matched, matchedTopic } = scoreTier2(
      detail.title,
      detail.description,
      detail.department,
      detail.number,
      tokens,
      matchedDepts,
      undefined,
      detail.sectionTopics,
      rawTokens,
    );

    if (score > 0) {
      const rawReasons = [...new Set([...matched, ...detail.tier1Matched])];
      const reasons = formatMatchReasons(
        rawReasons,
        detail.department,
        matchedDepts,
        undefined,
        matchedTopic,
      );
      scoreMap.set(key, {
        department: detail.department,
        number: detail.number,
        title: detail.title,
        units: detail.units,
        description: detail.description,
        relevanceScore: Math.round(score * 100) / 100,
        matchReasons: reasons,
        sectionTopics:
          detail.sectionTopics.length > 0 ? detail.sectionTopics : undefined,
      });
    }
  }

  // Score GE courses — merge geTag into existing entries or add new ones
  for (const geCourses of geResults) {
    for (const gc of geCourses as any[]) {
      const key = `${gc.department}-${gc.number}`;
      const existing = scoreMap.get(key);

      if (existing) {
        // Course already scored from detail fetch — re-score with GE bonus and attach tag
        const { score, matched, matchedTopic } = scoreTier2(
          existing.title,
          existing.description,
          existing.department,
          existing.number,
          tokens,
          matchedDepts,
          gc.geTag,
          gc.sectionTopics,
          rawTokens,
        );
        existing.geTag = gc.geTag;
        existing.relevanceScore = Math.round(score * 100) / 100;
        if (!existing.sectionTopics && gc.sectionTopics?.length > 0) {
          existing.sectionTopics = gc.sectionTopics;
        }
        const newReasons = formatMatchReasons(
          [...new Set([...matched])],
          existing.department,
          matchedDepts,
          gc.geTag,
          matchedTopic,
        );
        existing.matchReasons = [
          ...new Set([...(existing.matchReasons || []), ...newReasons]),
        ];
        continue;
      }

      const { score, matched, matchedTopic } = scoreTier2(
        gc.title,
        gc.description,
        gc.department,
        gc.number,
        tokens,
        matchedDepts,
        gc.geTag,
        gc.sectionTopics,
        rawTokens,
      );

      if (score > 0) {
        const reasons = formatMatchReasons(
          matched,
          gc.department,
          matchedDepts,
          gc.geTag,
          matchedTopic,
        );
        scoreMap.set(key, {
          department: gc.department,
          number: gc.number,
          title: gc.title,
          units: gc.units,
          description: gc.description,
          relevanceScore: Math.round(score * 100) / 100,
          matchReasons: reasons,
          geTag: gc.geTag,
          sectionTopics:
            gc.sectionTopics.length > 0 ? gc.sectionTopics : undefined,
        });
      }
    }
  }

  const scored = [...scoreMap.values()];

  // Sort by relevance, filter by units if specified, return top 15
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const filtered = unitsFilter
    ? scored.filter((c) => c.units === unitsFilter)
    : scored;
  return filtered.slice(0, 15);
}
