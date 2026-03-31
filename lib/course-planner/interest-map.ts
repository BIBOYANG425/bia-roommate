// ─── Stop words to remove from interest text ───
const STOP_WORDS = new Set([
  "i",
  "me",
  "my",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "so",
  "as",
  "at",
  "in",
  "on",
  "of",
  "to",
  "for",
  "by",
  "with",
  "from",
  "about",
  "into",
  "like",
  "want",
  "would",
  "could",
  "should",
  "really",
  "very",
  "also",
  "just",
  "some",
  "more",
  "most",
  "other",
  "than",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "not",
  "no",
  "can",
  "will",
  "interested",
  "enjoy",
  "love",
  "curious",
  "explore",
  "learn",
  "study",
  "take",
  "class",
  "classes",
  "course",
  "courses",
]);

// ─── Naive stemmer (handles ~80% of common suffixes) ───
export function simpleStem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("tion")) return word.slice(0, -4);
  if (word.endsWith("sion")) return word.slice(0, -4);
  if (word.endsWith("ment")) return word.slice(0, -4);
  if (word.endsWith("ness")) return word.slice(0, -4);
  if (word.endsWith("ity")) return word.slice(0, -3);
  if (word.endsWith("ical")) return word.slice(0, -4);
  if (word.endsWith("ing") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ous") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ive") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("al") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3)
    return word.slice(0, -1);
  return word;
}

// ─── Tokenize interest text into meaningful stemmed tokens ───
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .map(simpleStem);
}

// ─── Score how well a target text matches a set of interest tokens ───
export function tokenMatchScore(
  tokens: string[],
  targetText: string,
): { score: number; matched: string[] } {
  if (tokens.length === 0) return { score: 0, matched: [] };
  const target = targetText.toLowerCase();
  const targetTokens = target
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(simpleStem);
  const targetSet = new Set(targetTokens);

  const matched: string[] = [];
  for (const token of tokens) {
    // Exact token match
    if (targetSet.has(token)) {
      matched.push(token);
      continue;
    }
    // Prefix match (e.g., "anim" matches "animation" but not "earth" containing "art")
    if (token.length >= 3 && targetTokens.some((t) => t.startsWith(token))) {
      matched.push(token);
    }
  }

  return {
    score: matched.length / tokens.length,
    matched: [...new Set(matched)],
  };
}

// ─── Interest keyword → USC department prefix mapping ───
// Maps common interest terms to relevant USC department codes
export const INTEREST_DEPARTMENT_MAP: Record<string, string[]> = {
  // Arts & Creative
  art: ["ARTS", "ARLT", "FACS", "AHIS"],
  anim: ["CTAN", "ARLT", "ARTS", "ACAD"],
  draw: ["ARTS", "FACS", "DSGN"],
  paint: ["ARTS", "FACS"],
  design: ["DSGN", "ARTS", "ARCH", "ITP"],
  photo: ["ARTS", "CTAN"],
  sculpt: ["ARTS", "FACS"],

  // Film & Media
  film: ["CTCS", "CTAN", "CTWR", "COMM"],
  cinema: ["CTCS", "CTAN"],
  media: ["COMM", "JOUR", "AMST", "CTAN"],
  televis: ["CTCS", "CTAN", "COMM"],
  journal: ["JOUR", "COMM"],
  screen: ["CTWR", "CTAN", "CTCS"],

  // Music & Performance
  music: ["MUCO", "MUSC", "MUIN", "MUHL", "MUPF"],
  theater: ["THTR", "DRMA"],
  theatr: ["THTR", "DRMA"],
  drama: ["DRMA", "THTR"],
  danc: ["DANC", "THTR"],
  perform: ["THTR", "DANC", "MUPF"],

  // Computer Science & Tech
  cod: ["CSCI", "ITP", "DSCI"],
  program: ["CSCI", "ITP", "DSCI"],
  comput: ["CSCI", "EE", "CECS", "ITP"],
  softwar: ["CSCI", "ITP"],
  web: ["ITP", "CSCI"],
  data: ["DSCI", "CSCI", "MATH", "INF"],
  machin: ["CSCI", "EE", "DSCI"],
  artifici: ["CSCI", "PHIL", "DSCI"],
  robot: ["CSCI", "EE", "AME"],
  cyber: ["CSCI", "INF", "ITP"],
  game: ["CSCI", "CTIN", "ITP"],

  // Engineering
  engineer: ["ENGR", "BME", "CHE", "CE", "EE", "ME", "AME", "ISE"],
  electr: ["EE", "PHYS"],
  mechan: ["ME", "AME", "PHYS"],
  biomed: ["BME", "BISC"],
  aero: ["AME", "ASTE"],
  space: ["ASTE", "AME", "PHYS"],
  chem: ["CHEM", "CHE"],

  // Science
  bio: ["BISC", "BME", "NEUR"],
  physic: ["PHYS", "ASTR"],
  astro: ["ASTR", "PHYS"],
  neuro: ["NEUR", "PSYC", "BISC"],
  math: ["MATH", "DSCI"],
  statist: ["MATH", "DSCI"],
  environ: ["ENST", "BISC", "GEOG"],
  sustain: ["ENST", "GEOG"],
  climat: ["ENST", "GEOG", "BISC"],

  // Social Sciences
  psycholog: ["PSYC"],
  psych: ["PSYC"],
  sociol: ["SOCI"],
  politic: ["POSC", "IR"],
  govern: ["POSC", "IR", "PPD"],
  econom: ["ECON", "PPD"],
  anthro: ["ANTH"],
  geograph: ["GEOG"],
  urban: ["PPD", "GEOG"],
  law: ["LAW", "POSC"],
  justic: ["SOCI", "AMST", "POSC", "SWMS", "LAW"],
  social: ["SOCI", "SWMS", "AMST"],
  crimin: ["SOCI", "POSC"],
  gender: ["SWMS", "SOCI", "AMST"],
  rac: ["AMST", "SOCI", "POSC"],
  divers: ["AMST", "SOCI", "SWMS"],
  "human right": ["IR", "POSC", "SOCI"],

  // Humanities
  histor: ["HIST", "AHIS", "AMST"],
  philosoph: ["PHIL"],
  phil: ["PHIL"],
  ethic: ["PHIL", "SOCI"],
  religi: ["REL"],
  literat: ["ENGL", "COLT", "ARLT"],
  english: ["ENGL", "WRIT"],
  writ: ["WRIT", "ENGL", "CTWR"],
  creativ: ["CTWR", "WRIT", "ENGL"],
  poet: ["ENGL", "WRIT"],
  linguist: ["LING"],
  languag: ["LING", "EALC", "FREN", "SPAN", "GERM"],

  // Languages & Culture
  japanes: ["EALC", "EASC", "JAPN"],
  chinese: ["EALC", "EASC", "CHIN"],
  korean: ["EALC", "EASC", "KORE"],
  asian: ["EALC", "EASC", "AMST"],
  spanish: ["SPAN"],
  french: ["FREN"],
  german: ["GERM"],
  latin: ["CLAS", "SPAN"],
  global: ["IR", "POSC", "GEOG"],
  internat: ["IR", "POSC"],

  // Business & Entrepreneurship
  business: ["BUAD", "BAEP", "ECON", "ACCT", "FBE"],
  entrepre: ["BAEP", "BUAD"],
  startup: ["BAEP", "ITP", "BUAD"],
  market: ["BUAD", "COMM", "ECON"],
  financ: ["FBE", "ECON", "ACCT"],
  account: ["ACCT"],
  manag: ["BUAD", "MOR"],
  leader: ["MOR", "BUAD"],

  // Health & Medicine
  health: ["HPRE", "GERO", "PHBI", "HP"],
  medic: ["BISC", "BME", "HPRE"],
  "public health": ["HPRE", "HP", "PHBI"],
  nutrit: ["HPRE", "BISC"],
  mental: ["PSYC", "SWMS"],

  // Communication
  communic: ["COMM", "JOUR", "PR"],
  "public relat": ["COMM", "PR"],
  speech: ["COMM"],
  advertis: ["COMM", "JOUR"],

  // Education
  educ: ["EDUC", "EDHP"],
  teach: ["EDUC"],
};

// ─── Get matching department prefixes for a set of interest tokens ───
export function getDepartmentMatches(tokens: string[]): Set<string> {
  const depts = new Set<string>();
  for (const token of tokens) {
    for (const [keyword, departments] of Object.entries(
      INTEREST_DEPARTMENT_MAP,
    )) {
      // Multi-word keys (e.g., "public health") require exact match — don't let
      // a lone token like "public" trigger phrase-key departments
      if (keyword.includes(" ")) {
        if (token === keyword) {
          for (const dept of departments) depts.add(dept);
        }
      } else if (token.includes(keyword) || keyword.includes(token)) {
        for (const dept of departments) depts.add(dept);
      }
    }
  }
  return depts;
}
