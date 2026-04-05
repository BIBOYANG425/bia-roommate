import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getAvatarColor,
  getLastChar,
  relativeTime,
  habitLevel,
  schoolKey,
  schoolAccent,
  schoolGold,
} from "../utils";

describe("getAvatarColor", () => {
  it("returns a consistent color for the same name", () => {
    const color1 = getAvatarColor("Alice");
    const color2 = getAvatarColor("Alice");
    expect(color1).toBe(color2);
  });

  it("returns a tailwind bg class", () => {
    const color = getAvatarColor("Bob");
    expect(color).toMatch(/^bg-\w+-500$/);
  });

  it("returns different colors for different names", () => {
    const colors = new Set(
      ["Alice", "Bob", "Charlie", "Diana", "Eve"].map(getAvatarColor),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("getLastChar", () => {
  it("returns last character", () => {
    expect(getLastChar("Hello")).toBe("o");
    expect(getLastChar("A")).toBe("A");
  });

  it("returns empty for empty string", () => {
    expect(getLastChar("")).toBe("");
  });
});

describe("relativeTime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 刚刚 for just now", () => {
    expect(relativeTime(new Date().toISOString())).toBe("刚刚");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe("5分钟前");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(relativeTime(threeHoursAgo)).toBe("3小时前");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(relativeTime(twoDaysAgo)).toBe("2天前");
  });
});

describe("habitLevel", () => {
  const options = ["low", "medium", "high"] as const;

  it("returns 0 for null", () => {
    expect(habitLevel(null, options)).toBe(0);
  });

  it("returns 0 for unknown value", () => {
    expect(habitLevel("unknown", options)).toBe(0);
  });

  it("calculates correct percentage", () => {
    expect(habitLevel("low", options)).toBeCloseTo(33.33, 0);
    expect(habitLevel("medium", options)).toBeCloseTo(66.67, 0);
    expect(habitLevel("high", options)).toBe(100);
  });
});

describe("schoolKey", () => {
  it("maps school names to keys", () => {
    expect(schoolKey("USC")).toBe("usc");
    expect(schoolKey("UC Berkeley")).toBe("berkeley");
    expect(schoolKey("Stanford")).toBe("stanford");
    expect(schoolKey(null)).toBe("usc");
  });
});

describe("schoolAccent", () => {
  it("returns correct CSS variable", () => {
    expect(schoolAccent("USC")).toBe("var(--cardinal)");
    expect(schoolAccent("UC Berkeley")).toBe("var(--berkeley-blue)");
    expect(schoolAccent("Stanford")).toBe("var(--stanford-cardinal)");
    expect(schoolAccent(null)).toBe("var(--cardinal)");
  });
});

describe("schoolGold", () => {
  it("returns correct CSS variable", () => {
    expect(schoolGold("USC")).toBe("var(--gold)");
    expect(schoolGold("UC Berkeley")).toBe("var(--berkeley-gold)");
    expect(schoolGold("Stanford")).toBe("var(--stanford-gold)");
  });
});
