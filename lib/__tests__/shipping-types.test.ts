import { describe, it, expect } from "vitest";
import {
  SHIPPING_METHOD_VALUES,
  SHIPPING_METHOD_META,
  SHIPPING_METHOD_ORDER,
  SHIPPING_CONTACT_TYPES,
  PARCEL_CATEGORY_OPTIONS,
  CN_CARRIER_OPTIONS,
  PARCEL_STATUS_VALUES,
} from "../types";

// Catches the easy-to-forget mistake of adding a shipping method to
// SHIPPING_METHOD_VALUES but leaving META or ORDER incomplete — which
// would silently break the picker, schedule card, or admin UI.
describe("shipping method constants stay in sync", () => {
  it("has META entry for every method", () => {
    for (const m of SHIPPING_METHOD_VALUES) {
      expect(SHIPPING_METHOD_META[m]).toBeDefined();
      expect(SHIPPING_METHOD_META[m].label).toBeTruthy();
      expect(SHIPPING_METHOD_META[m].labelEn).toBeTruthy();
      expect(SHIPPING_METHOD_META[m].icon).toBeTruthy();
    }
  });

  it("has ORDER entry for every method", () => {
    for (const m of SHIPPING_METHOD_VALUES) {
      expect(SHIPPING_METHOD_ORDER[m]).toBeTypeOf("number");
    }
  });

  it("ORDER values are distinct", () => {
    const values = SHIPPING_METHOD_VALUES.map((m) => SHIPPING_METHOD_ORDER[m]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("META has no entries beyond the defined methods", () => {
    const extras = Object.keys(SHIPPING_METHOD_META).filter(
      (k) => !SHIPPING_METHOD_VALUES.includes(k as never),
    );
    expect(extras).toEqual([]);
  });
});

describe("shipping domain constants", () => {
  it("includes the three expected methods", () => {
    expect([...SHIPPING_METHOD_VALUES].sort()).toEqual(
      ["air", "sea", "sensitive"].sort(),
    );
  });

  it("contact types include all four channels", () => {
    expect([...SHIPPING_CONTACT_TYPES].sort()).toEqual(
      ["wechat_group", "wechat_personal", "email", "george_bot"].sort(),
    );
  });

  it("category options are non-empty strings", () => {
    for (const c of PARCEL_CATEGORY_OPTIONS) {
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it("carrier options are non-empty strings", () => {
    for (const c of CN_CARRIER_OPTIONS) {
      expect(c.length).toBeGreaterThan(0);
    }
  });

  it("parcel status values are all defined", () => {
    expect(PARCEL_STATUS_VALUES.length).toBeGreaterThan(0);
  });
});

// Smoke test mirroring the API validation logic — catches accidental
// widening of the validation set without a migration.
describe("API-layer method/category validation sets", () => {
  const METHOD_SET = new Set<string>(SHIPPING_METHOD_VALUES);
  const CATEGORY_SET = new Set<string>(PARCEL_CATEGORY_OPTIONS);
  const CARRIER_SET = new Set<string>(CN_CARRIER_OPTIONS);

  it("accepts known methods and rejects unknowns", () => {
    expect(METHOD_SET.has("sea")).toBe(true);
    expect(METHOD_SET.has("air")).toBe(true);
    expect(METHOD_SET.has("sensitive")).toBe(true);
    expect(METHOD_SET.has("teleport")).toBe(false);
    expect(METHOD_SET.has("")).toBe(false);
  });

  it("category set is case-sensitive", () => {
    expect(CATEGORY_SET.has("电子产品")).toBe(true);
    expect(CATEGORY_SET.has("electronics")).toBe(false);
  });

  it("carrier set rejects unknown carriers", () => {
    expect(CARRIER_SET.has("顺丰")).toBe(true);
    expect(CARRIER_SET.has("UPS")).toBe(false);
  });
});
