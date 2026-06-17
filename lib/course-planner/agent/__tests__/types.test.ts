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

  it("truncates clarifyingQuestion chips to 8 instead of rejecting", () => {
    // Repro: open-ended request ("any easy elective") makes the LLM emit
    // >8 chips. Schema caps chips at 8 — strict parse used to throw
    // "Too big: expected array to have <=8 items" and crash the request.
    const input = {
      isValid: true,
      needsClarification: true,
      clarifyingQuestions: [
        {
          key: "subject",
          label: "Easy elective about what subject?",
          chips: [
            "Surprise me",
            "Art",
            "Music",
            "Film",
            "History",
            "Philosophy",
            "Psychology",
            "Communication",
            "Sociology", // 9th chip — over the cap
          ],
        },
      ],
    };

    const result = validateInterpretedQuery(input);
    expect(result.clarifyingQuestions).toHaveLength(1);
    expect(result.clarifyingQuestions![0].chips).toHaveLength(8);
    expect(result.clarifyingQuestions![0].chips).toEqual([
      "Surprise me",
      "Art",
      "Music",
      "Film",
      "History",
      "Philosophy",
      "Psychology",
      "Communication",
    ]);
  });

  it("truncates clarifyingQuestions list to 2 instead of rejecting", () => {
    const input = {
      isValid: true,
      needsClarification: true,
      clarifyingQuestions: [
        { key: "a", label: "Q1", chips: ["x", "y"] },
        { key: "b", label: "Q2", chips: ["x", "y"] },
        { key: "c", label: "Q3", chips: ["x", "y"] }, // 3rd — over the cap of 2
      ],
    };

    const result = validateInterpretedQuery(input);
    expect(result.clarifyingQuestions).toHaveLength(2);
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
