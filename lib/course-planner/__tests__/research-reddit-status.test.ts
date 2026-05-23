/**
 * Locks down PR #40's anti-fab promise: researchReddit must always set
 * `redditDataStatus` on every course so the recommender prompt can refuse
 * to cite Reddit when no real data exists.
 *
 * Three states, three branches:
 *   - all fetches throw / non-OK  → every course gets "unavailable"
 *   - fetches succeed but a course gets 0 keyword matches  → "no_matches"
 *   - fetches succeed and the course is mentioned in a post  → "fetched"
 *
 * Without this test, someone deleting the stamping loop (agent.ts:709-713)
 * would leave the default in place and the LLM would silently regress to
 * fabricating quotes when Reddit is down.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __test } from "../agent";
import {
  buildCourse,
  buildRedditSearchResponse,
} from "./fixtures";

const { researchReddit } = __test;

const NOOP_INSTRUCTIONS = {
  searchQueries: ["CSCI 104 USC", "best USC CS class"],
  lookFor: "",
  avoid: "",
};

describe("researchReddit — redditDataStatus tri-state", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("marks every course 'unavailable' when ALL Reddit fetches throw", async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error("ENOTFOUND")));
    const courses = [
      buildCourse({ department: "CSCI", number: "104" }),
      buildCourse({ department: "CSCI", number: "270" }),
    ];

    await researchReddit(courses, NOOP_INSTRUCTIONS);

    for (const c of courses) {
      expect(c.redditDataStatus).toBe("unavailable");
      expect(c.redditPosts).toEqual([]);
    }
  });

  it("marks every course 'unavailable' when ALL responses are non-OK", async () => {
    fetchSpy.mockResolvedValue(
      new Response("rate limited", { status: 429 }) as unknown as Response,
    );
    const courses = [buildCourse()];

    await researchReddit(courses, NOOP_INSTRUCTIONS);

    expect(courses[0].redditDataStatus).toBe("unavailable");
  });

  it("marks the course 'no_matches' when fetches succeed but no post mentions it", async () => {
    fetchSpy.mockImplementation(async () => {
      const body = buildRedditSearchResponse([
        { title: "Best dining hall at USC?", score: 50 },
        { title: "Parking near campus", score: 30 },
      ]);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response;
    });
    const courses = [buildCourse({ department: "CSCI", number: "104" })];

    await researchReddit(courses, NOOP_INSTRUCTIONS);

    expect(courses[0].redditDataStatus).toBe("no_matches");
    expect(courses[0].redditPosts).toEqual([]);
  });

  it("marks the course 'fetched' when a post explicitly mentions the course code", async () => {
    fetchSpy.mockImplementation(async () => {
      const body = buildRedditSearchResponse([
        {
          title: "CSCI 104 is hard but worth it",
          score: 42,
          permalink: "/r/USC/comments/x1y2z3/csci104_review/",
        },
        { title: "Unrelated", score: 5 },
      ]);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response;
    });
    const courses = [buildCourse({ department: "CSCI", number: "104" })];

    await researchReddit(courses, NOOP_INSTRUCTIONS);

    expect(courses[0].redditDataStatus).toBe("fetched");
    expect(courses[0].redditPosts).toHaveLength(1);
    expect(courses[0].redditPosts[0].url).toContain(
      "reddit.com/r/USC/comments/x1y2z3",
    );
  });

  it("marks 'unavailable' when no search queries provided (defensive)", async () => {
    const courses = [buildCourse()];
    await researchReddit(courses, { ...NOOP_INSTRUCTIONS, searchQueries: [] });
    expect(courses[0].redditDataStatus).toBe("unavailable");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
