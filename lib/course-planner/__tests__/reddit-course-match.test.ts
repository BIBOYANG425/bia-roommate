/**
 * Word-boundary course-code matching in Reddit research (RG2 item 6).
 *
 * The old substring match ("CSCI 100".includes("CSCI 10")) attached a CSCI 100
 * post to CSCI 10. These tests lock the boundary behavior at both levels: the
 * pure matcher and the end-to-end researchReddit attachment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __test } from "../agent";
import { buildCourse, buildRedditSearchResponse } from "./fixtures";

const { buildCourseCodeMatcher, researchReddit } = __test;

describe("buildCourseCodeMatcher", () => {
  it("matches the exact course code with a space", () => {
    const re = buildCourseCodeMatcher("CSCI", "10");
    expect(re.test("Is CSCI 10 worth taking?")).toBe(true);
  });

  it("matches the smashed form (no space)", () => {
    const re = buildCourseCodeMatcher("CSCI", "100");
    expect(re.test("thoughts on CSCI100 this fall")).toBe(true);
  });

  it("does NOT match a longer number (CSCI 10 must not hit CSCI 100)", () => {
    const re = buildCourseCodeMatcher("CSCI", "10");
    expect(re.test("CSCI 100 is a fun intro")).toBe(false);
    expect(re.test("took CSCI100 last year")).toBe(false);
  });

  it("is case-insensitive", () => {
    const re = buildCourseCodeMatcher("CSCI", "104");
    expect(re.test("csci 104 review")).toBe(true);
  });

  it("does not match when the prefix runs into other letters", () => {
    const re = buildCourseCodeMatcher("EE", "101");
    expect(re.test("GEE 101 is unrelated")).toBe(false);
    expect(re.test("EE 101 lab")).toBe(true);
  });
});

describe("researchReddit — word-boundary attachment", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => fetchSpy.mockRestore());

  it("a 'CSCI 100' post attaches to CSCI 100 but NOT CSCI 10", async () => {
    fetchSpy.mockImplementation(async () => {
      const body = buildRedditSearchResponse([
        {
          title: "CSCI 100 is a great first-year intro",
          score: 40,
          permalink: "/r/USC/comments/aaa111/csci100_intro/",
        },
      ]);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response;
    });

    const csci10 = buildCourse({ department: "CSCI", number: "10" });
    const csci100 = buildCourse({ department: "CSCI", number: "100" });

    await researchReddit([csci10, csci100], {
      searchQueries: ["CSCI intro USC"],
      lookFor: "",
      avoid: "",
    });

    expect(csci100.redditPosts).toHaveLength(1);
    expect(csci100.redditDataStatus).toBe("fetched");
    expect(csci10.redditPosts).toHaveLength(0);
    expect(csci10.redditDataStatus).toBe("no_matches");
  });
});
