/**
 * Pin test for the extracted agent prompts (RG3). The exact prompt strings drive
 * model behavior, so this locks the load-bearing sections and the module surface.
 * agent.ts imports these constants; if someone deletes a section here the agent's
 * interpreter / recommender contract silently changes.
 */

import { describe, it, expect } from "vitest";
import {
  SYSTEM_PROMPT_INTERPRETER,
  SYSTEM_PROMPT_RECOMMENDER,
} from "../prompts";

describe("course-planner prompts module", () => {
  it("exports both system prompts as non-empty strings", () => {
    expect(typeof SYSTEM_PROMPT_INTERPRETER).toBe("string");
    expect(typeof SYSTEM_PROMPT_RECOMMENDER).toBe("string");
    expect(SYSTEM_PROMPT_INTERPRETER.length).toBeGreaterThan(1000);
    expect(SYSTEM_PROMPT_RECOMMENDER.length).toBeGreaterThan(1000);
  });

  it("interpreter prompt opens with the dispatcher role and keeps its tables", () => {
    expect(SYSTEM_PROMPT_INTERPRETER.startsWith(
      "You are a USC course search dispatcher.",
    )).toBe(true);
    // The dept-code table and GE category map are documented inside the prompt.
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("USC department codes:");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("USC GE categories:");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("CLARIFICATION GATE");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("Respond with ONLY valid JSON:");
  });

  it("recommender prompt opens with the ranking role and anti-fabrication rules", () => {
    expect(SYSTEM_PROMPT_RECOMMENDER.startsWith(
      "You are a USC course recommendation engine.",
    )).toBe(true);
    expect(SYSTEM_PROMPT_RECOMMENDER).toContain(
      "COMMUNITY HIGHLIGHTS — STRICT ANTI-FABRICATION RULES:",
    );
    expect(SYSTEM_PROMPT_RECOMMENDER).toContain("Respond with ONLY a JSON array:");
  });
});
