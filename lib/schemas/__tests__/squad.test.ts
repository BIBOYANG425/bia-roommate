import { describe, expect, it } from "vitest";
import { squadCreateSchema } from "../squad";

const valid = {
  poster_name: "A",
  category: "饭搭子",
  content: "Dinner",
  contact: "wechat",
};

describe("squad capacity", () => {
  it("rejects one-person squads at the shared validation boundary", () => {
    expect(squadCreateSchema.safeParse({ ...valid, max_people: 1 }).success).toBe(false);
    expect(squadCreateSchema.safeParse({ ...valid, max_people: "1" }).success).toBe(false);
  });

  it("accepts capacities from 2 through 50", () => {
    expect(squadCreateSchema.safeParse({ ...valid, max_people: 2 }).success).toBe(true);
    expect(squadCreateSchema.safeParse({ ...valid, max_people: "50" }).success).toBe(true);
  });
});
