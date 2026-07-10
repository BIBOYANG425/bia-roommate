import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("roommate submission auth contract", () => {
  const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

  it("does not persist an anonymous roommate profile", () => {
    expect(source).not.toContain("user_id: user?.id ?? null");
    expect(source).not.toContain("is(\"user_id\", null)");
  });
});
