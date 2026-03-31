export const GE_CATEGORIES = [
  { id: "GE-A", name: "The Arts" },
  { id: "GE-B", name: "Humanistic Inquiry" },
  { id: "GE-C", name: "Social Analysis" },
  { id: "GE-D", name: "Life Sciences" },
  { id: "GE-E", name: "Physical Sciences" },
  { id: "GE-F", name: "Quantitative Reasoning" },
  { id: "GE-G", name: "Global Perspectives I" },
  { id: "GE-H", name: "Global Perspectives II" },
] as const;

export type GECategoryId = (typeof GE_CATEGORIES)[number]["id"];
