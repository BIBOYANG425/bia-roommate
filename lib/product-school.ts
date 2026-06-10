import { SCHOOL_OPTIONS } from "@/lib/types";

export type ProductSchool = (typeof SCHOOL_OPTIONS)[number];

export const PRODUCT_SCHOOL_STORAGE_KEY = "bia-active-school";
export const DEFAULT_PRODUCT_SCHOOL: ProductSchool = "USC";

const SCHOOL_ALIASES: Record<string, ProductSchool> = {
  usc: "USC",
  "u-s-c": "USC",
  berkeley: "UC Berkeley",
  "uc-berkeley": "UC Berkeley",
  "uc berkeley": "UC Berkeley",
  ucb: "UC Berkeley",
  cal: "UC Berkeley",
  stanford: "Stanford",
};

export function normalizeProductSchool(value: unknown): ProductSchool | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const exact = SCHOOL_OPTIONS.find((school) => school === trimmed);
  if (exact) return exact;

  const key = trimmed.toLowerCase().replace(/_/g, "-");
  return SCHOOL_ALIASES[key] ?? null;
}

export function readStoredProductSchool(): ProductSchool | null {
  if (typeof window === "undefined") return null;

  try {
    return normalizeProductSchool(
      window.localStorage.getItem(PRODUCT_SCHOOL_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function writeStoredProductSchool(school: ProductSchool): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PRODUCT_SCHOOL_STORAGE_KEY, school);
  } catch {
    // Storage can fail in private mode or restricted browser contexts.
  }
}

export function resolveInitialProductSchool(
  queryValue: string | null | undefined,
): ProductSchool {
  return (
    normalizeProductSchool(queryValue) ??
    readStoredProductSchool() ??
    DEFAULT_PRODUCT_SCHOOL
  );
}

export function schoolToQueryValue(school: ProductSchool): string {
  return school;
}
