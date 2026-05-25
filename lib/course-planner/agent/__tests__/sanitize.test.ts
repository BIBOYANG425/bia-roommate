import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sanitizeCommunityHighlights } from "../sanitize";
import type { ResearchedCourse } from "../types";

function buildCourse(
  overrides: Partial<ResearchedCourse> = {},
): ResearchedCourse {
  return {
    department: "CSCI",
    number: "104",
    title: "Data Structures",
    units: "4",
    description: "",
    instructors: [],
    rmpHighlights: [],
    redditPosts: [],
    redditDataStatus: "fetched",
    ...overrides,
  };
}

describe("sanitizeCommunityHighlights", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns [] for non-array input", () => {
    expect(sanitizeCommunityHighlights(null, buildCourse())).toEqual([]);
    expect(sanitizeCommunityHighlights("oops", buildCourse())).toEqual([]);
    expect(sanitizeCommunityHighlights({}, buildCourse())).toEqual([]);
  });

  it("returns [] when LLM passes legacy string highlights", () => {
    // This is the old bug surface: model emitting `["Reddit: 'made-up'"]`.
    // We now refuse to render anything that isn't a {source,quote} object.
    const out = sanitizeCommunityHighlights(
      ["Reddit: 'Best 2-unit class'"],
      buildCourse(),
    );
    expect(out).toEqual([]);
  });

  it("drops reddit highlights without a URL (LLM hallucination)", () => {
    const out = sanitizeCommunityHighlights(
      [{ source: "reddit", quote: "fabricated quote" }],
      buildCourse(),
    );
    expect(out).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("drops reddit highlights whose URL was never fetched", () => {
    // Course has one verified post, but LLM cites a URL we never saw.
    const out = sanitizeCommunityHighlights(
      [
        {
          source: "reddit",
          quote: "fabricated quote",
          url: "https://www.reddit.com/r/USC/comments/FAKEFAKE/",
        },
      ],
      buildCourse({
        redditPosts: [
          {
            title: "Real post",
            url: "https://www.reddit.com/r/USC/comments/real123/",
            score: 5,
          },
        ],
      }),
    );
    expect(out).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("keeps reddit highlights whose URL matches a fetched post", () => {
    const url = "https://www.reddit.com/r/USC/comments/real123/";
    const out = sanitizeCommunityHighlights(
      [{ source: "reddit", quote: "Best 2-unit class", url }],
      buildCourse({
        redditPosts: [{ title: "Real post", url, score: 5 }],
      }),
    );
    expect(out).toEqual([
      { source: "reddit", quote: "Best 2-unit class", url },
    ]);
  });

  it("keeps RMP highlights without requiring a URL", () => {
    const out = sanitizeCommunityHighlights(
      [{ source: "rmp", quote: "Best prof: Smith — 4.6/5 RMP" }],
      buildCourse(),
    );
    expect(out).toEqual([
      { source: "rmp", quote: "Best prof: Smith — 4.6/5 RMP" },
    ]);
  });

  it("drops unknown sources", () => {
    const out = sanitizeCommunityHighlights(
      [{ source: "twitter", quote: "..." }, { source: "rmp", quote: "ok" }],
      buildCourse(),
    );
    expect(out).toEqual([{ source: "rmp", quote: "ok" }]);
  });

  it("drops entries without a quote", () => {
    const out = sanitizeCommunityHighlights(
      [
        { source: "reddit", quote: "", url: "https://www.reddit.com/r/USC/x/" },
        { source: "rmp", quote: "  " },
      ],
      buildCourse({
        redditPosts: [
          {
            title: "x",
            url: "https://www.reddit.com/r/USC/x/",
            score: 1,
          },
        ],
      }),
    );
    expect(out).toEqual([]);
  });

  it("returns [] when courseData is undefined and source is reddit", () => {
    // No course context → no validRedditUrls → no Reddit highlight can survive.
    const out = sanitizeCommunityHighlights(
      [
        {
          source: "reddit",
          quote: "Looks plausible",
          url: "https://www.reddit.com/r/USC/x/",
        },
      ],
      undefined,
    );
    expect(out).toEqual([]);
  });

  it("preserves both kinds when both are valid", () => {
    const url = "https://www.reddit.com/r/USC/comments/real123/";
    const out = sanitizeCommunityHighlights(
      [
        { source: "reddit", quote: "Real quote", url },
        { source: "rmp", quote: "Best prof: Smith" },
      ],
      buildCourse({
        redditPosts: [{ title: "Real post", url, score: 5 }],
      }),
    );
    expect(out).toEqual([
      { source: "reddit", quote: "Real quote", url },
      { source: "rmp", quote: "Best prof: Smith" },
    ]);
  });
});
