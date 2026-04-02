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
  "stuff",
  "things",
  "thing",
  "something",
  "anything",
  "everything",
  "lot",
  "lots",
  "much",
  "many",
  "few",
  "little",
  "big",
  // Search intent / filler words
  "find",
  "search",
  "looking",
  "look",
  "need",
  "get",
  "give",
  "show",
  "tell",
  "help",
  "please",
  "thanks",
  "thank",
  // Qualifiers that aren't topical
  "easy",
  "hard",
  "difficult",
  "simple",
  "fun",
  "boring",
  "cool",
  "good",
  "great",
  "best",
  "worst",
  "nice",
  "awesome",
  "chill",
  "without",
  "any",
  "all",
  "only",
  "every",
  "each",
  "both",
  "new",
  "old",
  "same",
  "different",
  "possible",
  // Prepositions / conjunctions
  "between",
  "during",
  "before",
  "after",
  "through",
  "over",
  "under",
  "around",
  "up",
  "down",
  "out",
  "off",
  "then",
  "when",
  "where",
  "how",
  "what",
  "which",
  "who",
  "why",
  // Course logistics
  "midterm",
  "midterms",
  "final",
  "finals",
  "exam",
  "exams",
  "homework",
  "assignment",
  "grade",
  "grading",
  "unit",
  "units",
  "credit",
  "credits",
  "semester",
  "session",
  "section",
  "professor",
  "prof",
  "instructor",
  "teacher",
  "ta",
]);

// ─── Synonym / alias expansion ───
// Maps short forms, abbreviations, and colloquial terms to canonical keywords
// that the department map and title matching can pick up.
const SYNONYMS: Record<string, string[]> = {
  ai: ["artificial", "intelligence", "machine", "learning", "deep", "neural"],
  ml: ["machine", "learning", "data", "artificial"],
  cs: ["computer", "science", "programming", "software"],
  ee: ["electrical", "engineering", "circuits", "electronics"],
  me: ["mechanical", "engineering"],
  bio: ["biology", "biological", "life", "science"],
  chem: ["chemistry", "chemical"],
  econ: ["economics", "economy", "economic"],
  "poli sci": ["political", "science", "government", "politics"],
  polisci: ["political", "science", "government", "politics"],
  psych: ["psychology", "psychological", "mental", "behavioral"],
  stats: ["statistics", "statistical", "data", "probability"],
  math: ["mathematics", "mathematical", "calculus", "algebra"],
  env: ["environmental", "environment", "sustainability"],
  ir: ["international", "relations", "global", "diplomacy"],
  pr: ["public", "relations", "communications"],
  ux: ["user", "experience", "design", "interface"],
  ui: ["user", "interface", "design", "frontend"],
  vr: ["virtual", "reality", "immersive"],
  ar: ["augmented", "reality"],
  nlp: ["natural", "language", "processing", "computational", "linguistics"],
  hci: ["human", "computer", "interaction", "interface", "design"],
  iot: ["internet", "things", "embedded", "sensors"],

  // Colloquial → academic
  coding: ["programming", "computer", "science", "software", "development"],
  hacking: ["cybersecurity", "security", "computer", "network"],
  apps: ["software", "development", "mobile", "programming", "application"],
  websites: ["web", "development", "programming", "internet"],
  money: ["finance", "economics", "business", "accounting"],
  stocks: ["finance", "investment", "economics", "financial"],
  startup: ["entrepreneurship", "business", "venture", "innovation"],
  movies: ["film", "cinema", "screenwriting", "production"],
  tv: ["television", "media", "broadcast", "production"],
  acting: ["theater", "drama", "performance", "acting"],
  singing: ["music", "vocal", "performance"],
  drawing: ["art", "illustration", "visual", "fine", "arts"],
  painting: ["art", "fine", "arts", "visual", "studio"],
  robots: ["robotics", "engineering", "mechanical", "automation"],
  space: ["aerospace", "astronomy", "astrophysics", "physics"],
  rockets: ["aerospace", "engineering", "propulsion", "astronautical"],
  brain: ["neuroscience", "psychology", "cognitive", "neural"],
  mind: ["psychology", "cognitive", "neuroscience", "philosophy"],
  dna: ["genetics", "biology", "molecular", "biochemistry"],
  genes: ["genetics", "biology", "molecular", "genomics"],
  drugs: ["pharmacology", "chemistry", "health", "pharmaceutical"],
  medicine: ["biomedical", "health", "pre-med", "biology", "anatomy"],
  doctor: ["pre-med", "health", "biology", "medicine"],
  premed: ["biology", "chemistry", "health", "pre-med", "anatomy"],
  law: ["legal", "political", "science", "justice", "policy"],
  lawyer: ["legal", "political", "science", "pre-law", "justice"],
  climate: ["environmental", "sustainability", "earth", "science", "ecology"],
  green: ["environmental", "sustainability", "ecology"],
  animals: ["biology", "zoology", "ecology", "wildlife"],
  ocean: ["marine", "biology", "environmental", "earth", "science"],
  earth: ["geology", "environmental", "earth", "science", "geography"],
  weather: ["atmospheric", "science", "meteorology", "earth"],
  buildings: ["architecture", "engineering", "design", "urban"],
  cities: ["urban", "planning", "geography", "architecture", "policy"],
  anime: ["animation", "japanese", "art", "media", "east", "asian"],
  manga: ["japanese", "art", "literature", "east", "asian", "comics"],
  kpop: ["korean", "music", "east", "asian", "culture", "media"],
  language: ["linguistics", "language", "communication"],
  writing: ["creative", "writing", "english", "composition", "literature"],
  poetry: ["english", "literature", "creative", "writing"],
  reading: ["english", "literature", "humanities"],
  history: ["history", "historical"],
  ancient: ["classical", "history", "archaeology", "civilization"],
  philosophy: ["philosophy", "ethics", "logic", "metaphysics"],
  religion: ["religious", "studies", "theology", "spirituality"],
  politics: ["political", "science", "government", "policy"],
  society: ["sociology", "social", "anthropology", "culture"],
  culture: ["anthropology", "sociology", "cultural", "studies"],
  people: ["sociology", "anthropology", "psychology", "social"],
  data: ["data", "science", "analytics", "statistics", "informatics"],
  blockchain: ["computer", "science", "cryptography", "distributed", "systems"],
  crypto: ["cryptography", "computer", "science", "security", "finance"],
  cloud: ["computer", "science", "distributed", "systems", "network"],
  security: ["cybersecurity", "computer", "science", "information", "security"],
  networks: ["computer", "network", "telecommunications", "distributed"],
  databases: ["computer", "science", "data", "information", "systems"],
  algorithms: ["computer", "science", "mathematics", "optimization"],
  numbers: ["mathematics", "statistics", "quantitative"],
  sports: ["kinesiology", "physical", "education", "athletics"],
  exercise: ["kinesiology", "physical", "education", "health"],
  nutrition: ["health", "biology", "food", "science", "kinesiology"],
  food: ["nutrition", "food", "science", "culinary", "health"],
  fashion: ["design", "art", "textiles", "merchandising", "retail"],
  journalism: ["journalism", "media", "communication", "writing"],
  news: ["journalism", "media", "communication", "public", "affairs"],
  advertising: ["advertising", "marketing", "communication", "media"],
  marketing: ["marketing", "business", "communication", "advertising"],
  management: ["management", "business", "organization", "leadership"],
  accounting: ["accounting", "finance", "business"],
  taxes: ["accounting", "finance", "tax", "economics"],
  investing: ["finance", "investment", "economics", "business"],
  "real estate": ["real", "estate", "finance", "business", "development"],
  teaching: ["education", "pedagogy", "teaching", "curriculum"],
  kids: ["education", "child", "development", "psychology"],
  children: ["education", "child", "development", "psychology", "pediatric"],
};

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
  if (word.endsWith("ly") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("er") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3)
    return word.slice(0, -1);
  return word;
}

// ─── Base tokenizer: clean, split, remove stop words, stem ───
function tokenizeBase(text: string): { stemmed: string[]; filtered: string[]; words: string[] } {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
  const filtered = words.filter((w) => !STOP_WORDS.has(w));
  const stemmed = filtered.map(simpleStem);
  return { stemmed, filtered, words };
}

// ─── Tokenize interest text into meaningful stemmed tokens ───
// Also extracts bigrams for multi-word phrase matching
export function tokenize(text: string): string[] {
  const { stemmed, filtered, words } = tokenizeBase(text);

  // Extract bigrams before removing stop words (phrases like "social justice" need both words)
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  // Expand synonyms: check both raw words and bigrams
  const expanded = new Set(stemmed);

  for (const word of filtered) {
    const syns = SYNONYMS[word];
    if (syns) {
      for (const syn of syns) {
        expanded.add(simpleStem(syn));
      }
    }
  }

  for (const bigram of bigrams) {
    const syns = SYNONYMS[bigram];
    if (syns) {
      for (const syn of syns) {
        expanded.add(simpleStem(syn));
      }
    }
  }

  return [...expanded];
}

// Raw stemmed tokens without synonym expansion — used for section topic matching
// where expanded synonyms dilute the match ratio
export function tokenizeRaw(text: string): string[] {
  return tokenizeBase(text).stemmed;
}

// ─── Score how well a target text matches a set of interest tokens ───
export function tokenMatchScore(
  tokens: string[],
  targetText: string,
): { score: number; matched: string[] } {
  if (tokens.length === 0) return { score: 0, matched: [] };
  const target = targetText.toLowerCase();
  const targetWords = target.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/);
  const targetTokens = targetWords.map(simpleStem);
  const targetSet = new Set(targetTokens);

  // Also build a joined string for substring matching
  const targetJoined = targetTokens.join(" ");

  const matched: string[] = [];
  for (const token of tokens) {
    // Exact token match
    if (targetSet.has(token)) {
      matched.push(token);
      continue;
    }
    // Prefix match (e.g., "anim" matches "animation")
    if (
      token.length >= 3 &&
      targetTokens.some(
        (t) => t.startsWith(token) || (token.startsWith(t) && t.length >= 4),
      )
    ) {
      matched.push(token);
      continue;
    }
    // Substring match for longer tokens (e.g., "entrepreneur" in a description)
    if (token.length >= 5 && targetJoined.includes(token)) {
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
  illustr: ["ARTS", "FACS", "DSGN"],
  graphic: ["DSGN", "ARTS", "ITP"],
  visual: ["ARTS", "FACS", "DSGN", "CTAN"],
  creativ: ["CTWR", "WRIT", "ARTS", "ENGL"],

  // Film & Media
  film: ["CTCS", "CTAN", "CTWR", "COMM"],
  cinema: ["CTCS", "CTAN"],
  media: ["COMM", "JOUR", "AMST", "CTAN"],
  televis: ["CTCS", "CTAN", "COMM"],
  journal: ["JOUR", "COMM"],
  screen: ["CTWR", "CTAN", "CTCS"],
  product: ["CTAN", "CTCS", "BUAD"],
  broadcast: ["COMM", "JOUR", "CTAN"],
  document: ["CTAN", "CTCS", "JOUR"],

  // Music & Performance
  music: ["MUCO", "MUSC", "MUIN", "MUHL", "MUPF"],
  theater: ["THTR", "DRMA"],
  theatr: ["THTR", "DRMA"],
  drama: ["DRMA", "THTR"],
  danc: ["DANC", "THTR"],
  perform: ["THTR", "DANC", "MUPF"],
  vocal: ["MUPF", "MUSC"],
  composit: ["MUCO", "MUSC", "WRIT", "ENGL"],
  orchestra: ["MUPF", "MUSC"],

  // Computer Science & Tech
  cod: ["CSCI", "ITP", "DSCI"],
  program: ["CSCI", "ITP", "DSCI"],
  comput: ["CSCI", "EE", "CECS", "ITP"],
  softwar: ["CSCI", "ITP"],
  web: ["ITP", "CSCI"],
  data: ["DSCI", "CSCI", "MATH", "INF"],
  machin: ["CSCI", "EE", "DSCI"],
  artifici: ["CSCI", "PHIL", "DSCI"],
  intellig: ["CSCI", "DSCI", "PHIL"],
  robot: ["CSCI", "EE", "AME"],
  cyber: ["CSCI", "INF", "ITP"],
  game: ["CSCI", "CTIN", "ITP"],
  neural: ["CSCI", "NEUR", "EE"],
  deep: ["CSCI", "DSCI", "EE"],
  algorithm: ["CSCI", "MATH"],
  databas: ["CSCI", "INF", "DSCI"],
  network: ["CSCI", "EE", "INF"],
  distribut: ["CSCI", "EE"],
  cryptograph: ["CSCI", "MATH"],
  cloud: ["CSCI", "ITP"],
  mobil: ["ITP", "CSCI"],
  app: ["ITP", "CSCI"],
  frontend: ["ITP", "CSCI"],
  backend: ["CSCI", "ITP"],
  system: ["CSCI", "EE", "ISE"],
  analyt: ["DSCI", "CSCI", "BUAD"],
  informat: ["INF", "CSCI", "DSCI"],

  // Engineering
  engineer: ["ENGR", "BME", "CHE", "CE", "EE", "ME", "AME", "ISE"],
  electr: ["EE", "PHYS"],
  mechan: ["ME", "AME", "PHYS"],
  biomed: ["BME", "BISC"],
  aero: ["AME", "ASTE"],
  space: ["ASTE", "AME", "PHYS"],
  chem: ["CHEM", "CHE"],
  circuit: ["EE", "PHYS"],
  embed: ["EE", "CSCI"],
  sensor: ["EE", "BME", "AME"],
  propuls: ["AME", "ASTE"],
  automat: ["ISE", "CSCI", "EE"],
  manufactur: ["ISE", "ME", "AME"],
  civil: ["CE", "ENST"],
  structur: ["CE", "ARCH"],
  material: ["ME", "CHE", "MASC"],

  // Science
  bio: ["BISC", "BME", "NEUR"],
  biolog: ["BISC", "BME"],
  physic: ["PHYS", "ASTR"],
  astro: ["ASTR", "PHYS"],
  astrono: ["ASTR", "PHYS"],
  astrophys: ["ASTR", "PHYS"],
  neuro: ["NEUR", "PSYC", "BISC"],
  neurosci: ["NEUR", "PSYC", "BISC"],
  math: ["MATH", "DSCI"],
  mathemat: ["MATH", "DSCI"],
  calcul: ["MATH"],
  algebra: ["MATH"],
  statist: ["MATH", "DSCI"],
  probabil: ["MATH", "DSCI"],
  environ: ["ENST", "BISC", "GEOG"],
  sustain: ["ENST", "GEOG"],
  climat: ["ENST", "GEOG", "BISC"],
  ecolog: ["BISC", "ENST"],
  genet: ["BISC", "BME"],
  molecul: ["BISC", "CHEM", "BME"],
  biochem: ["BISC", "CHEM"],
  anatom: ["BISC", "BME"],
  geolog: ["GEOL", "ENST"],
  marine: ["BISC", "ENST"],
  zoolog: ["BISC"],
  wildlif: ["BISC", "ENST"],
  archaeolog: ["ANTH", "CLAS", "AHIS"],

  // Social Sciences
  psycholog: ["PSYC"],
  psych: ["PSYC"],
  cognit: ["PSYC", "NEUR", "PHIL"],
  behavior: ["PSYC", "SOCI"],
  sociol: ["SOCI"],
  politic: ["POSC", "IR"],
  govern: ["POSC", "IR", "PPD"],
  econom: ["ECON", "PPD"],
  anthro: ["ANTH"],
  anthropolog: ["ANTH"],
  geograph: ["GEOG"],
  urban: ["PPD", "GEOG"],
  law: ["LAW", "POSC"],
  legal: ["LAW", "POSC"],
  justic: ["SOCI", "AMST", "POSC", "SWMS", "LAW"],
  social: ["SOCI", "SWMS", "AMST"],
  crimin: ["SOCI", "POSC"],
  gender: ["SWMS", "SOCI", "AMST"],
  rac: ["AMST", "SOCI", "POSC"],
  divers: ["AMST", "SOCI", "SWMS"],
  "human right": ["IR", "POSC", "SOCI"],
  policy: ["PPD", "POSC", "ECON"],
  "public policy": ["PPD", "POSC"],
  diplomac: ["IR", "POSC"],
  immigr: ["SOCI", "AMST", "IR"],

  // Humanities
  histor: ["HIST", "AHIS", "AMST"],
  philosoph: ["PHIL"],
  phil: ["PHIL"],
  ethic: ["PHIL", "SOCI"],
  logic: ["PHIL", "MATH"],
  religi: ["REL"],
  theolog: ["REL"],
  spiritu: ["REL"],
  literat: ["ENGL", "COLT", "ARLT"],
  english: ["ENGL", "WRIT"],
  writ: ["WRIT", "ENGL", "CTWR"],
  poet: ["ENGL", "WRIT"],
  linguist: ["LING"],
  languag: ["LING", "EALC", "FREN", "SPAN", "GERM"],
  classic: ["CLAS", "ARLT"],
  civiliz: ["HIST", "CLAS", "ANTH"],
  mytholog: ["CLAS", "REL", "ENGL"],

  // Languages & Culture
  japanes: ["EALC", "EASC", "JAPN"],
  chinese: ["EALC", "EASC", "CHIN"],
  korean: ["EALC", "EASC", "KORE"],
  asian: ["EALC", "EASC", "AMST"],
  "east asian": ["EALC", "EASC"],
  spanish: ["SPAN"],
  french: ["FREN"],
  german: ["GERM"],
  latin: ["CLAS", "SPAN"],
  global: ["IR", "POSC", "GEOG"],
  internat: ["IR", "POSC"],
  arab: ["ALI", "MDES"],
  hebrew: ["HEBR"],
  italian: ["ITAL"],
  portugues: ["PORT"],
  russian: ["RUSS"],

  // Business & Entrepreneurship
  business: ["BUAD", "BAEP", "ECON", "ACCT", "FBE"],
  entrepre: ["BAEP", "BUAD"],
  startup: ["BAEP", "ITP", "BUAD"],
  ventur: ["BAEP", "BUAD", "FBE"],
  innovat: ["BAEP", "BUAD", "ITP"],
  market: ["BUAD", "COMM", "ECON"],
  financ: ["FBE", "ECON", "ACCT"],
  invest: ["FBE", "ECON"],
  account: ["ACCT"],
  manag: ["BUAD", "MOR"],
  leader: ["MOR", "BUAD"],
  organiz: ["MOR", "BUAD"],
  consulti: ["BUAD", "MOR"],
  retail: ["BUAD", "ECON"],
  "supply chain": ["BUAD", "ISE"],
  logist: ["ISE", "BUAD"],
  "real estat": ["FBE", "BUAD"],
  tax: ["ACCT", "FBE"],

  // Health & Medicine
  health: ["HPRE", "GERO", "PHBI", "HP"],
  medic: ["BISC", "BME", "HPRE"],
  "pre-med": ["BISC", "CHEM", "HPRE"],
  premed: ["BISC", "CHEM", "HPRE"],
  "public health": ["HPRE", "HP", "PHBI"],
  nutrit: ["HPRE", "BISC"],
  mental: ["PSYC", "SWMS"],
  pharmac: ["CHEM", "BISC"],
  pediatr: ["PSYC", "BISC", "HPRE"],
  kinesiol: ["EXSC"],
  exercis: ["EXSC", "HPRE"],
  athlet: ["EXSC"],

  // Communication
  communic: ["COMM", "JOUR", "PR"],
  "public relat": ["COMM", "PR"],
  speech: ["COMM"],
  advertis: ["COMM", "JOUR"],
  persuasi: ["COMM", "PSYC"],
  rhetoric: ["COMM", "ENGL"],

  // Education
  educ: ["EDUC", "EDHP"],
  teach: ["EDUC"],
  pedagog: ["EDUC"],
  curricul: ["EDUC"],
  child: ["EDUC", "PSYC"],

  // Architecture & Urban
  architectur: ["ARCH"],
  architect: ["ARCH"],
  landscape: ["ARCH", "ENST"],
  plan: ["PPD", "ARCH"],
  "urban plan": ["PPD", "ARCH", "GEOG"],

  // Gaming & Interactive
  gaming: ["CTIN", "CSCI", "ITP"],
  interact: ["CTIN", "ITP", "CSCI"],
  immersiv: ["CTIN", "ITP", "CTAN"],
  virtual: ["CTIN", "ITP", "CSCI"],
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
