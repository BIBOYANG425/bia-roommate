/**
 * Shared test fixtures for course-planner unit tests.
 * Build minimal but realistic objects so tests stay focused on behavior,
 * not on remembering every field of ResearchedCourse / RedditPost.
 */

import { vi } from "vitest";
import type {
  InterpretedQuery,
  LLMConfig,
  RedditPost,
  ResearchedCourse,
} from "../agent/types";

export function buildCourse(
  overrides: Partial<ResearchedCourse> = {},
): ResearchedCourse {
  return {
    department: "CSCI",
    number: "104",
    title: "Data Structures",
    units: "4",
    description: "Intro DS course",
    instructors: [],
    rmpHighlights: [],
    redditPosts: [],
    redditDataStatus: "fetched",
    ...overrides,
  };
}

export function buildRedditPost(
  overrides: Partial<RedditPost> = {},
): RedditPost {
  return {
    title: "CSCI 104 is great",
    url: "https://www.reddit.com/r/USC/comments/abc123/csci_104/",
    score: 12,
    ...overrides,
  };
}

/** Build a fake Reddit API search response (mimics what fetch returns from
 *  reddit.com/r/USC/search.json). Pass post overrides per child. */
export function buildRedditSearchResponse(
  posts: Array<{
    title: string;
    selftext?: string;
    score?: number;
    numComments?: number;
    permalink?: string;
  }>,
) {
  return {
    data: {
      children: posts.map((p) => ({
        data: {
          title: p.title,
          selftext: p.selftext ?? "",
          score: p.score ?? 10,
          num_comments: p.numComments ?? 0,
          permalink:
            p.permalink ??
            "/r/USC/comments/" +
              Math.random().toString(36).slice(2, 8) +
              "/post/",
        },
      })),
    },
  };
}

/** A complete, valid InterpretedQuery — used in tests that need to feed
 *  the recommender or other downstream layers without going through the
 *  LLM interpreter first. Override only the fields the test cares about. */
export function buildInterpretedQuery(
  overrides: Partial<InterpretedQuery> = {},
): InterpretedQuery {
  return {
    isValid: true,
    catalogInstructions: {
      departments: ["CSCI"],
      geCategories: [],
      courseLevel: "any",
      unitsPreference: "any",
      searchTerms: [],
      filterNotes: "",
    },
    rmpInstructions: {
      prioritize: "highest rated",
      difficultyTarget: "any",
      minimumRating: "any",
      lookFor: "",
    },
    redditInstructions: { searchQueries: [], lookFor: "", avoid: "" },
    studentProfile: { interests: [], preferences: [], dealbreakers: [] },
    studentConstraints: { year: null, geNeeded: [], profRatingFloor: null },
    ...overrides,
  };
}

/** Build an LLMConfig stub for tests that need to call recommend() etc. */
export function buildLLMConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    provider: "anthropic",
    apiKey: "test-key",
    baseUrl: "",
    model: "test-model",
    ...overrides,
  };
}

/** Build a fake `Response` for `fetch` mocks. Saves the verbose
 *  `new Response(JSON.stringify(...), { status, headers: {...} }) as unknown as Response`
 *  ceremony in every researcher test. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as Response;
}

/** Install a fetch mock keyed on URL substring. Each route returns the
 *  matched response (or its handler's return value). Catches "did the
 *  researcher hit the right endpoint" regressions without per-test
 *  repetitive boilerplate. */
export function mockFetchRoutes(routes: Array<{
  match: string | RegExp;
  respond: (() => Response | Promise<Response>) | Response;
}>): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
    for (const r of routes) {
      const hit = typeof r.match === "string" ? url.includes(r.match) : r.match.test(url);
      if (hit) {
        return typeof r.respond === "function" ? r.respond() : r.respond;
      }
    }
    return new Response("not mocked: " + url, { status: 404 }) as unknown as Response;
  });
}
