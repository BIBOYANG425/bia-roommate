export const GE_CATEGORIES = [
  { id: "GE-A", name: "The Arts" },
  { id: "GE-B", name: "Humanistic Inquiry" },
  { id: "GE-C", name: "Social Analysis" },
  { id: "GE-D", name: "Life Sciences" },
  { id: "GE-E", name: "Physical Sciences" },
  { id: "GE-F", name: "Quantitative Reasoning" },
  { id: "GE-G", name: "Global Perspectives I" },
  { id: "GE-H", name: "Global Perspectives II" },
  // GESM intentionally omitted from the category grid: USC has no GESM category
  // endpoint (the seminars are filed under GE-A..H), so the grid button 404s.
  // GESM seminars remain reachable via course search and the interest/agent flow.
] as const;

export type GECategoryId = (typeof GE_CATEGORIES)[number]["id"];
