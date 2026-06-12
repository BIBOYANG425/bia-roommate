import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMatchingProfile, formTagsFrom } from "../interests";

const VEC = Array(1536).fill(0.02);

function makeAdmin() {
  const writes: Record<string, unknown[]> = { update: [], upsert: [], delete: [] };
  const admin = {
    from: vi.fn(() => ({
      update: (row: unknown) => ({ eq: () => { writes.update.push(row); return Promise.resolve({ error: null }); } }),
      upsert: (rows: unknown) => { writes.upsert.push(rows); return Promise.resolve({ error: null }); },
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    })),
  };
  return { admin: admin as never, writes };
}

describe("formTagsFrom", () => {
  it("normalizes controlled-vocab picks to snake_case tags", () => {
    expect(formTagsFrom(["study groups", "career events", "food"]))
      .toEqual(["study_groups", "career_events", "food"]);
  });
});

describe("buildMatchingProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes tags and one facet per pick + free-text + seed facet", async () => {
    const { admin, writes } = makeAdmin();
    const embed = vi.fn().mockResolvedValue([VEC, VEC, VEC, VEC]);
    const res = await buildMatchingProfile(admin, "s-1", {
      categories: ["hiking", "food"], freeText: "love kbbq nights",
      major: "Design", year: "sophomore",
    }, embed);
    expect(res).toEqual({ tags: 2, facets: 4, embedded: true });
    expect(embed).toHaveBeenCalledWith([
      "hiking", "food",
      "about me: love kbbq nights",
      "Design student, sophomore year at USC",
    ]);
    const upserted = writes.upsert[0] as { label: string }[];
    expect(upserted.map((r) => r.label)).toEqual(["hiking", "food", "about_me", "academic_seed"]);
  });

  it("embed failure → tags still written, no vectors, embedded=false (spec §11)", async () => {
    const { admin, writes } = makeAdmin();
    const embed = vi.fn().mockRejectedValue(new Error("embed_unavailable"));
    const res = await buildMatchingProfile(admin, "s-1", {
      categories: ["food"], freeText: "", major: null, year: null,
    }, embed);
    expect(res.embedded).toBe(false);
    expect(writes.update.length).toBe(1);
    expect(writes.upsert.length).toBe(0);
  });

  it("no signal at all → no writes beyond empty tags", async () => {
    const { admin } = makeAdmin();
    const embed = vi.fn();
    const res = await buildMatchingProfile(admin, "s-1",
      { categories: [], freeText: "", major: null, year: null }, embed);
    expect(res).toEqual({ tags: 0, facets: 0, embedded: false });
    expect(embed).not.toHaveBeenCalled();
  });
});
