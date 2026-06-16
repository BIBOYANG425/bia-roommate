// lib/squad/ping-reason.ts
// The ✦ reason on a ping card — george's "你之前提到 X" framing. Backed by real
// data (matched tag, else best facet); null renders no chip (no fake reasons).
export function buildPingReason(matchedTags: string[], bestFacet: string | null): string | null {
  const tag = matchedTags?.[0] ?? bestFacet;
  return tag ? `✦ 你提到 ${tag.replace(/_/g, " ")}` : null;
}
