/**
 * Failure-path tests for the interpreter. Locks down that:
 *   - timeout from the LLM provider surfaces as a recognizable error
 *   - malformed JSON (LLM returned prose instead of an object) throws the
 *     "Failed to parse query interpretation as JSON" message verbatim
 *   - completely empty content from the LLM is treated the same way
 *
 * Without these tests, regression in `interpret()` error handling (e.g.
 * swallowing thrown errors and returning a default query) would silently
 * give the user bogus recommendations on every flaky LLM call.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { __test } from "../agent";
import { buildLLMConfig } from "./fixtures";

vi.mock("../agent/llm-client", async () => {
  const actual = await vi.importActual<typeof import("../agent/llm-client")>(
    "../agent/llm-client",
  );
  return {
    ...actual,
    callLLMWithRetry: vi.fn(),
    getInterpreterConfig: vi.fn(() => null),
  };
});

import { callLLMWithRetry } from "../agent/llm-client";

const { interpret } = __test;

describe("interpret() — error paths", () => {
  beforeEach(() => {
    vi.mocked(callLLMWithRetry).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("propagates the underlying error when callLLMWithRetry rejects (timeout / abort)", async () => {
    vi.mocked(callLLMWithRetry).mockRejectedValueOnce(
      new Error("Request timed out after 30000ms"),
    );

    await expect(interpret("easy GE-C", buildLLMConfig())).rejects.toThrow(
      /timed out/i,
    );
  });

  it("throws when LLM returns prose instead of JSON (extractJSON guards before parse)", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content: "I'm not sure how to interpret that. Could you rephrase?",
      reasoning: "",
    });

    // extractJSON catches "no JSON object found"; if that ever changes, the
    // outer JSON.parse catch still fires. Either way the user sees a
    // recognizable JSON-related error and the streaming runner surfaces it.
    await expect(interpret("???", buildLLMConfig())).rejects.toThrow(
      /JSON|interpretation/i,
    );
  });

  it("throws on completely empty LLM content", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content: "",
      reasoning: "",
    });

    await expect(interpret("anything", buildLLMConfig())).rejects.toThrow(
      /JSON|interpretation/i,
    );
  });

  it("throws on truncated JSON output", async () => {
    // LLM hit max_tokens partway through emitting the object.
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content:
        '{"isValid": true, "catalogInstructions": {"departments": ["CSCI"',
      reasoning: "",
    });

    await expect(interpret("CSCI AI courses", buildLLMConfig())).rejects.toThrow(
      /Unmatched|JSON|interpretation/i,
    );
  });

  it("does NOT throw on valid JSON even if other fields are minimal", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      content: JSON.stringify({ isValid: true }),
      reasoning: "",
    });

    const { query } = await interpret("CSCI", buildLLMConfig());
    expect(query.isValid).toBe(true);
    // Zod defaults fill in the rest — see types.ts.
    expect(query.catalogInstructions.departments).toEqual([]);
    expect(query.studentConstraints).toEqual({
      year: null,
      geNeeded: [],
      profRatingFloor: null,
    });
  });
});
