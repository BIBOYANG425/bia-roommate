import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("OnboardingFlow profile errors", () => {
  const source = readFileSync(resolve(__dirname, "../OnboardingFlow.tsx"), "utf8");

  it("handles maybeSingle lookup errors instead of treating them as no profile", () => {
    expect(source).toMatch(/data:\s*existingProfile,\s*error:\s*profileError/);
    expect(source).toContain("if (profileError)");
  });

  it("handles a duplicate insert race explicitly", () => {
    expect(source).toMatch(/error\?\.code === "23505"/);
  });
});
