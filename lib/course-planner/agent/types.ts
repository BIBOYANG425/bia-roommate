/**
 * Shared types for the 3-layer course recommendation agent.
 * Single source of truth — imported by agent.ts and UI components via barrel export.
 */

import { z } from "zod";

// ─── Interpreter Output ───

export interface InterpretedQuery {
  isValid: boolean;
  rejection?: string;

  catalogInstructions: {
    departments: string[];
    geCategories: string[];
    courseLevel: string;
    unitsPreference: string;
    searchTerms: string[];
    filterNotes: string;
  };
  rmpInstructions: {
    prioritize: string;
    difficultyTarget: string;
    minimumRating: string;
    lookFor: string;
  };
  redditInstructions: {
    searchQueries: string[];
    lookFor: string;
    avoid: string;
  };

  studentProfile: {
    interests: string[];
    preferences: string[];
    dealbreakers: string[];
  };
}

// ─── Zod schema for validating LLM interpreter output ───

// Helper: accept null from LLMs and treat as missing (→ default applies)
const strOrNull = (def: string) =>
  z.union([z.string(), z.null()]).transform((v) => v ?? def).default(def);
const arrOrNull = (def: string[] = []) =>
  z.union([z.array(z.string()), z.null()]).transform((v) => v ?? def).default(def);

const CatalogInstructionsSchema = z.object({
  departments: arrOrNull(),
  geCategories: arrOrNull(),
  courseLevel: strOrNull("any"),
  unitsPreference: strOrNull("any"),
  searchTerms: arrOrNull(),
  filterNotes: strOrNull(""),
});

const RmpInstructionsSchema = z.object({
  prioritize: strOrNull(""),
  difficultyTarget: strOrNull("any"),
  minimumRating: strOrNull("any"),
  lookFor: strOrNull(""),
});

const RedditInstructionsSchema = z.object({
  searchQueries: arrOrNull(),
  lookFor: strOrNull(""),
  avoid: strOrNull(""),
});

const StudentProfileSchema = z.object({
  interests: arrOrNull(),
  preferences: arrOrNull(),
  dealbreakers: arrOrNull(),
});

const InterpretedQuerySchema = z.object({
  isValid: z.boolean(),
  rejection: z.string().optional(),
  catalogInstructions: CatalogInstructionsSchema.default(() => ({
    departments: [],
    geCategories: [],
    courseLevel: "any",
    unitsPreference: "any",
    searchTerms: [],
    filterNotes: "",
  })),
  rmpInstructions: RmpInstructionsSchema.default(() => ({
    prioritize: "",
    difficultyTarget: "any",
    minimumRating: "any",
    lookFor: "",
  })),
  redditInstructions: RedditInstructionsSchema.default(() => ({
    searchQueries: [],
    lookFor: "",
    avoid: "",
  })),
  studentProfile: StudentProfileSchema.default(() => ({
    interests: [],
    preferences: [],
    dealbreakers: [],
  })),
});

/** Validate and apply safe defaults to raw LLM interpreter output.
 *  Warns when key fields are missing/null (indicates LLM regression). */
export function validateInterpretedQuery(raw: unknown): InterpretedQuery {
  const obj = raw as Record<string, unknown> | null | undefined;
  const catalog = (obj?.catalogInstructions ?? {}) as Record<string, unknown>;

  if (!catalog.departments || !Array.isArray(catalog.departments)) {
    console.warn("[agent] Zod default applied: catalogInstructions.departments was missing/null");
  }
  if (!catalog.searchTerms || !Array.isArray(catalog.searchTerms)) {
    console.warn("[agent] Zod default applied: catalogInstructions.searchTerms was missing/null");
  }
  if (!catalog.geCategories || !Array.isArray(catalog.geCategories)) {
    console.warn("[agent] Zod default applied: catalogInstructions.geCategories was missing/null");
  }

  return InterpretedQuerySchema.parse(raw) as InterpretedQuery;
}

// ─── Research Layer Types ───

export interface SectionDetail {
  sectionId: string;
  topic: string;
  instructor: string;
  days: string;
  time: string;
}

export interface ResearchedCourse {
  department: string;
  number: string;
  title: string;
  units: string;
  description: string;
  instructors: {
    name: string;
    rating?: number;
    difficulty?: number;
    numRatings?: number;
    wouldTakeAgain?: number;
  }[];
  communityInsights: string[];
  peerRatings?: {
    avgDifficulty: number;
    avgWorkload: number;
    avgGrading: number;
    reviewCount: number;
  };
  geTag?: string;
  sectionTopics?: string[];
  /** For GESM/WRIT: specific section details so we recommend sections, not courses */
  sections?: SectionDetail[];
}

// ─── Recommendation Output ───

export interface AgentRecommendation {
  department: string;
  number: string;
  title: string;
  units: string;
  description: string;
  relevanceScore: number;
  matchReasons: string[];
  geTag?: string;
  topInstructor?: { name: string; rating: number };
  suggestedInstructor?: string;
  communityHighlights: string[];
  peerRatings?: {
    avgDifficulty: number;
    avgWorkload: number;
    avgGrading: number;
    reviewCount: number;
  };
  aiReasoning: string;
  sectionTopics?: string[];
  /** For GESM/WRIT: specific section the AI recommends */
  sectionId?: string;
  sectionTopic?: string;
  sectionTime?: string;
  sectionInstructor?: string;
}

// ─── Streaming Events (single source of truth) ───

export type AgentEvent =
  | { type: "thinking"; message: string }
  | { type: "reasoning"; step: "interpreter" | "recommender"; content: string }
  | {
      type: "interpreted";
      data: {
        interests: string[];
        preferences: string[];
        dealbreakers: string[];
        departments: string[];
        geCategories: string[];
      };
    }
  | {
      type: "researching";
      source: "catalog" | "rmp" | "reddit";
      message: string;
    }
  | {
      type: "research_done";
      source: "catalog" | "rmp" | "reddit";
      message: string;
    }
  | { type: "recommending"; message: string }
  | { type: "results"; data: AgentRecommendation[] }
  | { type: "error"; message: string; isRejection?: boolean };

// ─── LLM Provider Config ───

export type LLMProvider = "anthropic" | "openai" | "nvidia";

export type LLMConfig = {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export interface LLMResult {
  content: string;
  reasoning?: string;
}

// ─── GE API Mapping ───

export const GE_API_MAP: Record<string, { req: string; cat: string }> = {
  "GE-A": { req: "ACORELIT", cat: "ARTS" },
  "GE-B": { req: "ACORELIT", cat: "HINQ" },
  "GE-C": { req: "ACORELIT", cat: "SANA" },
  "GE-D": { req: "ACORELIT", cat: "LIFE" },
  "GE-E": { req: "ACORELIT", cat: "PSC" },
  "GE-F": { req: "ACORELIT", cat: "QREA" },
  "GE-G": { req: "AGLOPERS", cat: "GPG" },
  "GE-H": { req: "AGLOPERS", cat: "GPH" },
};
