import { describe, it, expect, vi } from "vitest";
import { validateInterpretedQuery } from "../types";

describe("validateInterpretedQuery", () => {
  it("passes through a well-formed query", () => {
    const input = {
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
        searchQueries: ["USC AI class"],
        lookFor: "easy classes",
        avoid: "",
      },
      studentProfile: {
        interests: ["AI"],
        preferences: [],
        dealbreakers: [],
      },
    };

    const result = validateInterpretedQuery(input);
    expect(result.isValid).toBe(true);
    expect(result.catalogInstructions.departments).toEqual(["CSCI"]);
    expect(result.studentProfile.interests).toEqual(["AI"]);
  });

  it("applies defaults when catalogInstructions fields are missing", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const input = {
      isValid: true,
      catalogInstructions: {
        courseLevel: "100-200",
        unitsPreference: "2",
        filterNotes: "",
      },
      rmpInstructions: {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      redditInstructions: {
        searchQueries: [],
        lookFor: "",
        avoid: "",
      },
      studentProfile: {
        interests: [],
        preferences: [],
        dealbreakers: [],
      },
    };

    const result = validateInterpretedQuery(input);
    expect(result.catalogInstructions.departments).toEqual([]);
    expect(result.catalogInstructions.searchTerms).toEqual([]);
    expect(result.catalogInstructions.geCategories).toEqual([]);

    // Should have warned about missing fields
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("departments was missing"),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("searchTerms was missing"),
    );

    spy.mockRestore();
  });

  it("applies defaults when entire sub-objects are missing", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const input = {
      isValid: false,
      rejection: "Not a course query",
    };

    const result = validateInterpretedQuery(input);
    expect(result.isValid).toBe(false);
    expect(result.catalogInstructions.departments).toEqual([]);
    expect(result.rmpInstructions.prioritize).toBe("");
    expect(result.studentProfile.interests).toEqual([]);

    spy.mockRestore();
  });

  it("handles null departments array from LLM", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const input = {
      isValid: true,
      catalogInstructions: {
        departments: null,
        geCategories: ["GE-C"],
        courseLevel: "any",
        unitsPreference: "any",
        searchTerms: ["easy"],
        filterNotes: "",
      },
      rmpInstructions: {
        prioritize: "",
        difficultyTarget: "any",
        minimumRating: "any",
        lookFor: "",
      },
      redditInstructions: {
        searchQueries: [],
        lookFor: "",
        avoid: "",
      },
      studentProfile: {
        interests: [],
        preferences: [],
        dealbreakers: [],
      },
    };

    const result = validateInterpretedQuery(input);
    // Zod should coerce null to default []
    expect(result.catalogInstructions.departments).toEqual([]);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("departments was missing"),
    );

    spy.mockRestore();
  });
});
