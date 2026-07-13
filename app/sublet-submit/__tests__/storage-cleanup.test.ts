import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sublet photo cleanup", () => {
  const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

  it("cleans successful partial uploads when a later upload or write fails", () => {
    expect(source).toContain("uploadedPaths");
    expect(source).toContain("cleanupSubletPhotos(uploadedPaths)");
  });

  it("removes deleted existing photos from storage after a successful edit", () => {
    expect(source).toContain("removedExistingPhotoPaths");
    expect(source).toContain("cleanupSubletPhotos(removedExistingPhotoPaths)");
  });
});
