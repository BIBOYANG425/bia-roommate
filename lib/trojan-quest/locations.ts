// Canonical Trojan Quest location IDs.
// Keep in sync with INITIAL_TASKS in app/trojan-quest/page.tsx.
// Header last reviewed: 2026-07-15
export const TROJAN_QUEST_LOCATION_IDS = [
  "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8",
  "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8",
  "d1", "d2", "d4", "d5",
] as const;

export type TrojanQuestLocationId = (typeof TROJAN_QUEST_LOCATION_IDS)[number];

const LOCATION_ID_SET = new Set<string>(TROJAN_QUEST_LOCATION_IDS);

export function isValidTrojanQuestLocationId(id: unknown): id is TrojanQuestLocationId {
  return typeof id === "string" && LOCATION_ID_SET.has(id);
}
