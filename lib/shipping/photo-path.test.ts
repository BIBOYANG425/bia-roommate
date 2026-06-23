import { describe, it, expect } from "vitest";
import { isOwnedPhotoPath, filterOwnedPhotos } from "./photo-path";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("isOwnedPhotoPath", () => {
  it("accepts a path under the caller's own folder", () => {
    expect(isOwnedPhotoPath(`${ME}/1700000000-abc.jpg`, ME)).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(isOwnedPhotoPath(`${OTHER}/1700000000-abc.jpg`, ME)).toBe(false);
  });

  it("rejects path traversal", () => {
    expect(isOwnedPhotoPath(`${ME}/../${OTHER}/x.jpg`, ME)).toBe(false);
  });

  it("rejects non-string / empty / bare-id values", () => {
    expect(isOwnedPhotoPath(null, ME)).toBe(false);
    expect(isOwnedPhotoPath(123, ME)).toBe(false);
    expect(isOwnedPhotoPath("", ME)).toBe(false);
    // must have the trailing slash — a prefix-only match is not an owned path
    expect(isOwnedPhotoPath(ME, ME)).toBe(false);
    expect(isOwnedPhotoPath(`${ME}-evil/x.jpg`, ME)).toBe(false);
  });
});

describe("filterOwnedPhotos", () => {
  it("keeps only owned paths and drops the rest", () => {
    const input = [
      `${ME}/a.jpg`,
      `${OTHER}/b.jpg`,
      `${ME}/../c.jpg`,
      42,
      `${ME}/d.jpg`,
    ];
    expect(filterOwnedPhotos(input, ME)).toEqual([`${ME}/a.jpg`, `${ME}/d.jpg`]);
  });

  it("handles undefined / null", () => {
    expect(filterOwnedPhotos(undefined, ME)).toEqual([]);
    expect(filterOwnedPhotos(null, ME)).toEqual([]);
  });

  it("caps at the max count", () => {
    const many = Array.from({ length: 10 }, (_, i) => `${ME}/${i}.jpg`);
    expect(filterOwnedPhotos(many, ME)).toHaveLength(6);
    expect(filterOwnedPhotos(many, ME, 3)).toHaveLength(3);
  });
});
