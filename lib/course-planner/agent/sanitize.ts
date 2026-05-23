/**
 * Defensive validation layer between the LLM's recommender output and what
 * we render to the user.
 *
 * Background: even with strict prompt instructions, the recommender model
 * occasionally hallucinates "Reddit" quotes when no posts were actually
 * fetched for a course. This module is the last line of defense — it drops
 * any Reddit highlight whose URL is not in the course's actually-fetched
 * `redditPosts`, ensuring the user can always click through to verify a
 * quote.
 */

import type {
  CommunityHighlight,
  ResearchedCourse,
} from "./types";

/**
 * Validate and shape the LLM's `communityHighlights` output for a single
 * course recommendation.
 *
 * Rules:
 * - Drop anything that isn't a `{source, quote, ...}` object.
 * - For `source === "reddit"`: require a non-empty `url` AND require that
 *   url to be present in the course's `redditPosts`. Otherwise the model
 *   either invented the post or mismatched the URL.
 * - For `source === "rmp"`: accept the quote as-is (no url).
 * - Unknown sources → drop silently.
 *
 * Returns an empty array if `raw` is not an array.
 */
export function sanitizeCommunityHighlights(
  raw: unknown,
  courseData: ResearchedCourse | undefined,
): CommunityHighlight[] {
  if (!Array.isArray(raw)) return [];
  // URLs are compared case-insensitively. Reddit permalinks are technically
  // case-sensitive at the comment ID level, but Reddit and most clients
  // canonicalize to lowercase, so an LLM that lowercases (or uppercases) a
  // valid URL should still match a real fetched post. Without this, a
  // lowercase echo of a mixed-case permalink gets dropped as "unverified".
  const validRedditUrls = new Set(
    (courseData?.redditPosts ?? []).map((p) => p.url.toLowerCase()),
  );
  const out: CommunityHighlight[] = [];
  const courseLabel =
    courseData ? `${courseData.department} ${courseData.number}` : "(unknown course)";

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const source = obj.source;
    const quote = typeof obj.quote === "string" ? obj.quote.trim() : "";
    const url = typeof obj.url === "string" ? obj.url.trim() : "";
    if (!quote) continue;

    if (source === "reddit") {
      if (!url) {
        console.warn(
          "[agent] Dropped reddit highlight without URL for",
          courseLabel,
          "-",
          quote.slice(0, 80),
        );
        continue;
      }
      if (!validRedditUrls.has(url.toLowerCase())) {
        console.warn(
          "[agent] Dropped reddit highlight with unverified URL for",
          courseLabel,
          "-",
          url,
        );
        continue;
      }
      out.push({ source: "reddit", quote, url });
    } else if (source === "rmp") {
      out.push({ source: "rmp", quote });
    }
  }

  return out;
}
