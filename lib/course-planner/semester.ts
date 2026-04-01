/**
 * USC term codes: YYYYS where S = 1 (Spring), 2 (Summer), 3 (Fall)
 * Example: 20253 = Fall 2025, 20261 = Spring 2026
 */

export function getCurrentSemesterCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Spring: Jan–May (1), Summer: Jun–Jul (2), Fall: Aug–Dec (3)
  let termCode: number;
  if (month <= 5) termCode = 1;
  else if (month <= 7) termCode = 2;
  else termCode = 3;

  return `${year}${termCode}`;
}

export function semesterLabel(code: string): string {
  const year = code.slice(0, 4);
  const s = code.charAt(4);
  const season = s === "1" ? "Spring" : s === "2" ? "Summer" : "Fall";
  return `${season} ${year}`;
}

export function getAvailableSemesters(): { code: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Build semesters: current + next few terms
  const semesters: { code: string; label: string }[] = [];

  if (month <= 5) {
    // In Spring → show Spring (current), Summer, Fall, next Spring
    semesters.push({ code: `${year}1`, label: `Spring ${year}` });
    semesters.push({ code: `${year}2`, label: `Summer ${year}` });
    semesters.push({ code: `${year}3`, label: `Fall ${year}` });
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` });
  } else if (month <= 7) {
    // In Summer → show Summer (current), Fall, next Spring, next Summer
    semesters.push({ code: `${year}2`, label: `Summer ${year}` });
    semesters.push({ code: `${year}3`, label: `Fall ${year}` });
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` });
    semesters.push({ code: `${year + 1}2`, label: `Summer ${year + 1}` });
  } else {
    // In Fall → show Fall (current), next Spring, next Summer, next Fall
    semesters.push({ code: `${year}3`, label: `Fall ${year}` });
    semesters.push({ code: `${year + 1}1`, label: `Spring ${year + 1}` });
    semesters.push({ code: `${year + 1}2`, label: `Summer ${year + 1}` });
    semesters.push({ code: `${year + 1}3`, label: `Fall ${year + 1}` });
  }

  return semesters;
}
