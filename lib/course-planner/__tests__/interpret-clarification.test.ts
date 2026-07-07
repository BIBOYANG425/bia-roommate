/**
 * Phase 2.3 clarification gate — verifies the interpreter→runner contract.
 *
 * When the LLM returns `needsClarification: true` + `clarifyingQuestions[]`,
 * the streaming runner must:
 *   - emit a `clarification` event with those questions
 *   - NOT run researchers (no `researching` event for catalog/RMP/reddit)
 *   - NOT emit `results` (research never ran)
 *
 * And the inverse: when LLM returns a normal query (no clarification), the
 * runner proceeds to research as before.
 *
 * Plus a schema sanity check that the prompt actually documents the
 * needsClarification branch (drift catch — if someone deletes the
 * "CLARIFICATION GATE" section, the LLM will stop emitting the field).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgentStreaming, type AgentEvent } from "../agent";
import type { LLMConfig } from "../agent/types";

vi.mock("../agent/llm-client", async () => {
  const actual = await vi.importActual<typeof import("../agent/llm-client")>(
    "../agent/llm-client",
  );
  return {
    ...actual,
    callLLMWithRetry: vi.fn(),
    getLLMConfig: vi.fn(
      (): LLMConfig => ({
        provider: "anthropic",
        apiKey: "test-key",
        baseUrl: "",
        model: "test",
      }),
    ),
    getInterpreterConfig: vi.fn(
      (): LLMConfig => ({
        provider: "anthropic",
        apiKey: "test-key",
        baseUrl: "",
        model: "test",
      }),
    ),
  };
});

import { callLLMWithRetry } from "../agent/llm-client";

describe("runAgentStreaming — clarification gate", () => {
  beforeEach(() => {
    vi.mocked(callLLMWithRetry).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("emits clarification event and stops when LLM requests it", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content: JSON.stringify({
        isValid: true,
        needsClarification: true,
        clarifyingQuestions: [
          {
            key: "theme",
            label: "What direction interests you?",
            chips: ["Tech", "Business", "Arts", "Surprise me"],
          },
        ],
        catalogInstructions: {
          departments: [],
          geCategories: [],
          courseLevel: "any",
          unitsPreference: "any",
          searchTerms: [],
          filterNotes: "",
        },
        rmpInstructions: {
          prioritize: "",
          difficultyTarget: "any",
          minimumRating: "any",
          lookFor: "",
        },
        redditInstructions: { searchQueries: [], lookFor: "", avoid: "" },
        studentProfile: { interests: [], preferences: [], dealbreakers: [] },
      }),
      reasoning: "",
    });

    const events: AgentEvent[] = [];
    const emit = (e: AgentEvent) => events.push(e);

    await runAgentStreaming(
      "what should I take",
      "20263",
      "http://localhost",
      undefined,
      false,
      emit,
    );

    const clarification = events.find((e) => e.type === "clarification");
    expect(clarification).toBeDefined();
    if (clarification?.type === "clarification") {
      expect(clarification.questions[0].key).toBe("theme");
      expect(clarification.questions[0].chips).toContain("Tech");
    }

    // Researchers must NOT have been engaged.
    expect(events.some((e) => e.type === "researching")).toBe(false);
    expect(events.some((e) => e.type === "results")).toBe(false);
  });

  it("proceeds to research when LLM returns a normal query (no clarification)", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content: JSON.stringify({
        isValid: true,
        catalogInstructions: {
          departments: ["CSCI"],
          geCategories: [],
          courseLevel: "any",
          unitsPreference: "any",
          searchTerms: ["AI"],
          filterNotes: "",
        },
        rmpInstructions: {
          prioritize: "highest rated",
          difficultyTarget: "any",
          minimumRating: "any",
          lookFor: "",
        },
        redditInstructions: {
          searchQueries: ["AI USC CSCI"],
          lookFor: "",
          avoid: "",
        },
        studentProfile: {
          interests: ["AI"],
          preferences: [],
          dealbreakers: [],
        },
      }),
      reasoning: "",
    });

    // Catalog fetch returns empty → runner emits "No courses found" error.
    // That's fine — we're only checking that the clarification gate didn't
    // short-circuit. The path past `interpreted` proves research ran.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ courses: [] }), {
          status: 200,
        }) as unknown as Response,
      );

    const events: AgentEvent[] = [];
    const emit = (e: AgentEvent) => events.push(e);

    await runAgentStreaming(
      "I want CSCI AI courses",
      "20263",
      "http://localhost",
      undefined,
      false,
      emit,
    );

    expect(events.some((e) => e.type === "clarification")).toBe(false);
    expect(events.some((e) => e.type === "interpreted")).toBe(true);

    fetchSpy.mockRestore();
  });

  it("interpreter prompt still documents the CLARIFICATION GATE section", async () => {
    // The prompt strings were extracted to prompts.ts (RG3); assert the section
    // survives there so the LLM keeps emitting the needsClarification field.
    const { SYSTEM_PROMPT_INTERPRETER } = await import("../prompts");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("CLARIFICATION GATE");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("needsClarification");
    expect(SYSTEM_PROMPT_INTERPRETER).toContain("clarifyingQuestions");
  });
});
