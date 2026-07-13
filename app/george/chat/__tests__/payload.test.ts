import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("does not send the ignored history payload", () => {
  const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
  expect(source).not.toMatch(/const history =/);
  expect(source).not.toMatch(/message: text, history, userId/);
});
