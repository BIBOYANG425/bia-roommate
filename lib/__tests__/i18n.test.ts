import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

// Guard for the bilingual dictionary. Deep-walks `t` and asserts every locale
// leaf (an object carrying an `en` and/or `zh` key) is a complete
// `{ en, zh }` pair of non-empty strings. This fails loudly if a future edit
// drops one locale (en/zh drift), leaves a leaf half-filled, or reintroduces a
// duplicate key that shadows a translation.
//
// Two leaves are intentionally empty in the product copy and are allowlisted by
// exact path below. If the shape of `t` changes so these paths no longer exist
// (e.g. an array reorder), the allowlist-coverage check at the bottom fails,
// forcing the allowlist to be re-verified rather than silently masking a
// different empty.
const INTENTIONAL_EMPTIES = new Set<string>([
  // Shenzhen mixer session — venue deliberately blank (rendered as "Venue TBA").
  "events.upcoming.sessions[1].venue",
  // E-Board is the top tier, so it has no "promotion" copy.
  "join.tiers[2].promotion",
]);

function isLocaleLeaf(node: unknown): node is Record<string, unknown> {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    return false;
  }
  const keys = Object.keys(node);
  return keys.includes("en") || keys.includes("zh");
}

describe("i18n dictionary integrity", () => {
  const allowlistHits = new Set<string>();
  const problems: string[] = [];

  function checkLeaf(node: Record<string, unknown>, path: string) {
    const hasEn = "en" in node && typeof node.en === "string";
    const hasZh = "zh" in node && typeof node.zh === "string";

    if (!hasEn) problems.push(`${path}: missing string "en" locale`);
    if (!hasZh) problems.push(`${path}: missing string "zh" locale`);
    if (!hasEn || !hasZh) return;

    if (INTENTIONAL_EMPTIES.has(path)) {
      allowlistHits.add(path);
      return;
    }

    if ((node.en as string).length === 0) problems.push(`${path}: empty "en" locale`);
    if ((node.zh as string).length === 0) problems.push(`${path}: empty "zh" locale`);
  }

  function walk(node: unknown, path: string) {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (isLocaleLeaf(node)) {
      checkLeaf(node as Record<string, unknown>, path);
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
    // primitives (plain strings like `value`/`city`/`image`) carry no locale.
  }

  walk(t, "");

  it("every locale leaf has non-empty en + zh (bar the allowlist)", () => {
    expect(problems).toEqual([]);
  });

  it("every allowlisted empty still exists in the dictionary", () => {
    expect([...allowlistHits].sort()).toEqual([...INTENTIONAL_EMPTIES].sort());
  });
});
