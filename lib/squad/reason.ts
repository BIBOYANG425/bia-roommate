// lib/squad/reason.ts
// Reason-chip text for ranked board cards (spec §5.1/§11.6). A chip must be
// backed by real data: named tag overlap, or a semantic match above
// SEMANTIC_DISPLAY_FLOOR. Anything weaker renders NO chip — never a fake reason.
export interface RankRow {
  post_id: string;
  rrf_score: number;
  semantic_sim: number | null;
  tag_overlap: number;
  matched_tags: string[];
  best_facet: string | null;
}

const SEMANTIC_DISPLAY_FLOOR = 0.35;

export const prettyTag = (t: string) => t.replace(/_/g, " ");

export function buildReason(r: RankRow): string | null {
  if (r.tag_overlap > 0 && r.matched_tags.length > 0) {
    return `✦ 你们都喜欢 ${r.matched_tags.slice(0, 2).map(prettyTag).join(" · ")}`;
  }
  if (r.best_facet && (r.semantic_sim ?? 0) >= SEMANTIC_DISPLAY_FLOOR) {
    return `✦ 兴趣相近：${prettyTag(r.best_facet)}`;
  }
  return null;
}
