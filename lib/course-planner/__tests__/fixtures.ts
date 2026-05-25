/**
 * Shared test fixtures for course-planner unit tests.
 * Build minimal but realistic objects so tests stay focused on behavior,
 * not on remembering every field of ResearchedCourse / RedditPost.
 */

import type {
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
    communityInsights: [],
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
