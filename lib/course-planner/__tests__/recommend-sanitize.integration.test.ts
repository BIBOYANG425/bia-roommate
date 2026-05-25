/**
 * Integration test that locks down PR #40's anti-fab guarantee at the
 * `recommend()` layer. The sanitize unit tests cover the validator in
 * isolation; this test confirms it actually fires for LLM-emitted bogus
 * URLs in the realistic recommend() → sanitize → final output flow.
 *
 * If someone accidentally bypasses `sanitizeCommunityHighlights` (e.g. by
 * writing recommendations from a different code path), this test goes red.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { __test } from "../agent";
import { buildCourse, buildRedditPost } from "./fixtures";
import type { InterpretedQuery, LLMConfig } from "../agent/types";

const { recommend } = __test;

// Mock the LLM client so the recommender LLM is fully under test control.
vi.mock("../agent/llm-client", async () => {
  const actual = await vi.importActual<typeof import("../agent/llm-client")>(
    "../agent/llm-client",
  );
  return {
    ...actual,
    callLLMWithRetry: vi.fn(),
  };
});

import { callLLMWithRetry } from "../agent/llm-client";

const STUB_QUERY: InterpretedQuery = {
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
    prioritize: "",
    difficultyTarget: "any",
    minimumRating: "any",
    lookFor: "",
  },
  redditInstructions: {
    searchQueries: [],
    lookFor: "",
    avoid: "",
  },
  studentProfile: { interests: ["cs"], preferences: [], dealbreakers: [] },
  studentConstraints: { year: null, geNeeded: [], profRatingFloor: null },
};

const STUB_CONFIG: LLMConfig = {
  provider: "anthropic",
  apiKey: "test-key",
  baseUrl: "",
  model: "test-model",
};

describe("recommend() — anti-fab end to end", () => {
  beforeEach(() => {
    vi.mocked(callLLMWithRetry).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("drops Reddit highlights whose URL was never fetched", async () => {
    const realPostUrl =
      "https://www.reddit.com/r/USC/comments/real123/csci104/";
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        redditPosts: [buildRedditPost({ url: realPostUrl })],
        redditDataStatus: "fetched",
      }),
    ];

    // LLM returns ONE legit highlight (matching URL) and ONE fabricated
    // (URL never appeared in our research).
    vi.mocked(callLLMWithRetry).mockResolvedValue({
      content: JSON.stringify([
        {
          department: "CSCI",
          number: "104",
          relevanceScore: 9,
          matchReasons: ["data structures"],
          communityHighlights: [
            {
              source: "reddit",
              quote: "CSCI 104 was the best class",
              url: realPostUrl,
            },
            {
              source: "reddit",
              quote: "Made-up testimonial that sounds plausible",
              url: "https://www.reddit.com/r/USC/comments/fake999/i_invented_this/",
            },
          ],
          aiReasoning: "Strong fit",
        },
      ]),
      reasoning: "",
    });

    const { recommendations } = await recommend(
      "I want a CS class",
      STUB_QUERY,
      courses,
      STUB_CONFIG,
    );

    expect(recommendations).toHaveLength(1);
    const highlights = recommendations[0].communityHighlights;
    // Verified URL kept, fabricated one dropped — anti-fab promise upheld.
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toMatchObject({
      source: "reddit",
      url: realPostUrl,
    });
  });

  it("returns [] communityHighlights when LLM fabricates with no fetched posts", async () => {
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        redditPosts: [], // we got nothing
        redditDataStatus: "unavailable",
      }),
    ];

    vi.mocked(callLLMWithRetry).mockResolvedValue({
      content: JSON.stringify([
        {
          department: "CSCI",
          number: "104",
          relevanceScore: 8,
          matchReasons: ["cs"],
          communityHighlights: [
            {
              source: "reddit",
              quote: "Hallucinated testimonial",
              url: "https://www.reddit.com/r/USC/comments/totally_fake/",
            },
          ],
          aiReasoning: "fits",
        },
      ]),
      reasoning: "",
    });

    const { recommendations } = await recommend(
      "I want a CS class",
      STUB_QUERY,
      courses,
      STUB_CONFIG,
    );

    expect(recommendations[0].communityHighlights).toEqual([]);
  });

  it("passes through RMP highlights without url (no anti-fab requirement)", async () => {
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        instructors: [{ name: "Prof Smith", rating: 4.7 }],
        redditPosts: [],
        redditDataStatus: "no_matches",
      }),
    ];

    vi.mocked(callLLMWithRetry).mockResolvedValue({
      content: JSON.stringify([
        {
          department: "CSCI",
          number: "104",
          relevanceScore: 9,
          matchReasons: ["good prof"],
          communityHighlights: [
            { source: "rmp", quote: "Prof Smith — 4.7/5 RMP" },
          ],
          aiReasoning: "Solid prof",
        },
      ]),
      reasoning: "",
    });

    const { recommendations } = await recommend(
      "I want a CS class",
      STUB_QUERY,
      courses,
      STUB_CONFIG,
    );

    expect(recommendations[0].communityHighlights).toEqual([
      { source: "rmp", quote: "Prof Smith — 4.7/5 RMP" },
    ]);
  });

  it("matches verified URL case-insensitively (catches LLM-lowercased URLs)", async () => {
    const fetched =
      "https://www.reddit.com/r/USC/comments/ABC123XYZ/csci_104_review/";
    const courses = [
      buildCourse({
        department: "CSCI",
        number: "104",
        redditPosts: [buildRedditPost({ url: fetched })],
        redditDataStatus: "fetched",
      }),
    ];

    vi.mocked(callLLMWithRetry).mockResolvedValue({
      content: JSON.stringify([
        {
          department: "CSCI",
          number: "104",
          relevanceScore: 9,
          matchReasons: ["match"],
          communityHighlights: [
            {
              source: "reddit",
              quote: "Solid class",
              // LLM emitted the same URL but lowercased the comment ID.
              url: fetched.toLowerCase(),
            },
          ],
          aiReasoning: "fits",
        },
      ]),
      reasoning: "",
    });

    const { recommendations } = await recommend(
      "I want a CS class",
      STUB_QUERY,
      courses,
      STUB_CONFIG,
    );

    expect(recommendations[0].communityHighlights).toHaveLength(1);
  });
});
