import { describe, it, expect } from "vitest";
import { extractJSON } from "../llm-client";

describe("extractJSON", () => {
  // ─── Object extraction ───

  it("extracts a simple JSON object", () => {
    const input = '{"isValid": true, "departments": ["CSCI"]}';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      isValid: true,
      departments: ["CSCI"],
    });
  });

  it("extracts JSON from surrounding text", () => {
    const input = 'Here is my response:\n{"isValid": true}\nDone!';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({ isValid: true });
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"isValid": true}\n```';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({ isValid: true });
  });

  it("strips markdown fences without json label", () => {
    const input = '```\n{"foo": "bar"}\n```';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({ foo: "bar" });
  });

  it("strips a fence and IGNORES trailing prose after the closing fence", () => {
    const input =
      '```json\n{"isValid": true, "note": "ok"}\n```\n\nHope this helps! Let me know if you want more.';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      isValid: true,
      note: "ok",
    });
  });

  it("prefers fenced content even when prose before the fence contains brackets", () => {
    const input =
      'Sure, see below {this is not json}:\n```json\n{"isValid": true}\n```\ndone';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      isValid: true,
    });
  });

  it("handles nested objects", () => {
    const input = '{"a": {"b": {"c": 1}}}';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      a: { b: { c: 1 } },
    });
  });

  it("handles escaped quotes inside strings", () => {
    const input = '{"msg": "he said \\"hello\\""}';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      msg: 'he said "hello"',
    });
  });

  it("handles braces inside string values", () => {
    const input = '{"note": "use {curly} braces", "ok": true}';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({
      note: "use {curly} braces",
      ok: true,
    });
  });

  it("ignores backslashes outside strings (parser bug fix)", () => {
    const input = 'some \\ note {"isValid": true}';
    expect(JSON.parse(extractJSON(input, "object"))).toEqual({ isValid: true });
  });

  // ─── Array extraction ───

  it("extracts a JSON array", () => {
    const input = '[{"dept": "CSCI"}, {"dept": "WRIT"}]';
    const result = JSON.parse(extractJSON(input, "array"));
    expect(result).toHaveLength(2);
    expect(result[0].dept).toBe("CSCI");
  });

  it("extracts array from surrounding text", () => {
    const input = 'Here are the results:\n[{"score": 9.5}]\nEnd.';
    const result = JSON.parse(extractJSON(input, "array"));
    expect(result[0].score).toBe(9.5);
  });

  it("extracts a fenced array and drops trailing prose after the fence", () => {
    const input =
      '```json\n[{"department":"CSCI","number":"100"}]\n```\nThese are ranked by relevance.';
    const result = JSON.parse(extractJSON(input, "array"));
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("100");
  });

  // ─── Error cases ───

  it("throws on no JSON object found", () => {
    expect(() => extractJSON("no json here", "object")).toThrow(
      "No JSON object found",
    );
  });

  it("throws on no JSON array found", () => {
    expect(() => extractJSON("no json here", "array")).toThrow(
      "No JSON array found",
    );
  });

  it("throws on unmatched open bracket", () => {
    expect(() => extractJSON("{unclosed", "object")).toThrow("Unmatched {");
  });
});
