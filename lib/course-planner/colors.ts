export const COURSE_COLORS = [
  { bg: "#990000", text: "#FFFFFF" }, // cardinal
  { bg: "#014B83", text: "#FFFFFF" }, // blue
  { bg: "#2D6A4F", text: "#FFFFFF" }, // forest
  { bg: "#7B2D8E", text: "#FFFFFF" }, // purple
  { bg: "#B85C00", text: "#FFFFFF" }, // burnt orange
  { bg: "#1A1410", text: "#FFCC00" }, // black/gold
  { bg: "#8C1515", text: "#FFFFFF" }, // dark red
  { bg: "#005F73", text: "#FFFFFF" }, // teal
] as const;

export function getNextColorIndex(usedIndices: number[]): number {
  for (let i = 0; i < COURSE_COLORS.length; i++) {
    if (!usedIndices.includes(i)) return i;
  }
  return usedIndices.length % COURSE_COLORS.length;
}
