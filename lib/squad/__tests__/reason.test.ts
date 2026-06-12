// lib/squad/__tests__/reason.test.ts
import { describe, expect, it } from "vitest";
import { buildReason, prettyTag, type RankRow } from "../reason";

const row = (over: Partial<RankRow> = {}): RankRow => ({
  post_id: "p1", rrf_score: 0.03, semantic_sim: 0.4,
  tag_overlap: 0, matched_tags: [], best_facet: null, ...over,
});

describe("prettyTag", () => {
  it("turns snake_case into a readable label", () => {
    expect(prettyTag("korean_food")).toBe("korean food");
  });
});

describe("buildReason (spec §5.1 — reason chips never fabricate)", () => {
  it("names the shared tags when there is tag overlap", () => {
    expect(buildReason(row({ tag_overlap: 2, matched_tags: ["korean_food", "hiking"] })))
      .toBe("✦ 你们都喜欢 korean food · hiking");
  });
  it("caps named tags at 2", () => {
    expect(buildReason(row({ tag_overlap: 3, matched_tags: ["a_b", "c_d", "e_f"] })))
      .toBe("✦ 你们都喜欢 a b · c d");
  });
  it("falls back to the best facet for semantic-only matches above the display floor", () => {
    expect(buildReason(row({ semantic_sim: 0.45, best_facet: "indie_music" })))
      .toBe("✦ 兴趣相近：indie music");
  });
  it("returns null when there is no real reason (no fake chips — spec §11.6)", () => {
    expect(buildReason(row({ semantic_sim: 0.2, best_facet: "indie_music" }))).toBeNull();
    expect(buildReason(row({ best_facet: null }))).toBeNull();
  });
});
