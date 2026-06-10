import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRODUCT_SCHOOL,
  PRODUCT_SCHOOL_STORAGE_KEY,
  normalizeProductSchool,
  readStoredProductSchool,
  resolveInitialProductSchool,
  schoolToQueryValue,
  writeStoredProductSchool,
} from "../product-school";

describe("normalizeProductSchool", () => {
  it("accepts exact school names", () => {
    expect(normalizeProductSchool("USC")).toBe("USC");
    expect(normalizeProductSchool("UC Berkeley")).toBe("UC Berkeley");
    expect(normalizeProductSchool("Stanford")).toBe("Stanford");
  });

  it("accepts common slugs and aliases", () => {
    expect(normalizeProductSchool("usc")).toBe("USC");
    expect(normalizeProductSchool("berkeley")).toBe("UC Berkeley");
    expect(normalizeProductSchool("uc-berkeley")).toBe("UC Berkeley");
    expect(normalizeProductSchool("uc berkeley")).toBe("UC Berkeley");
    expect(normalizeProductSchool("stanford")).toBe("Stanford");
  });

  it("rejects invalid values", () => {
    expect(normalizeProductSchool("")).toBeNull();
    expect(normalizeProductSchool("UCLA")).toBeNull();
    expect(normalizeProductSchool(null)).toBeNull();
  });
});

describe("product school storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubLocalStorage() {
    const store = new Map<string, string>();
    const localStorage = {
      clear: vi.fn(() => store.clear()),
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    };

    vi.stubGlobal("window", { localStorage });
    return localStorage;
  }

  it("returns null when storage is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(readStoredProductSchool()).toBeNull();
  });

  it("reads and writes valid schools", () => {
    const localStorage = stubLocalStorage();

    writeStoredProductSchool("UC Berkeley");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      PRODUCT_SCHOOL_STORAGE_KEY,
      "UC Berkeley",
    );
    expect(readStoredProductSchool()).toBe("UC Berkeley");
  });

  it("ignores invalid stored values", () => {
    const localStorage = stubLocalStorage();

    localStorage.setItem(PRODUCT_SCHOOL_STORAGE_KEY, "UCLA");
    expect(readStoredProductSchool()).toBeNull();
  });

  it("prefers query value before storage when resolving initial school", () => {
    stubLocalStorage();

    writeStoredProductSchool("Stanford");
    expect(resolveInitialProductSchool("USC")).toBe("USC");
  });

  it("falls back to storage then default", () => {
    const localStorage = stubLocalStorage();

    writeStoredProductSchool("Stanford");
    expect(resolveInitialProductSchool(null)).toBe("Stanford");
    localStorage.clear();
    expect(resolveInitialProductSchool(null)).toBe(DEFAULT_PRODUCT_SCHOOL);
  });
});

describe("schoolToQueryValue", () => {
  it("preserves shareable school names", () => {
    expect(schoolToQueryValue("UC Berkeley")).toBe("UC Berkeley");
  });
});
