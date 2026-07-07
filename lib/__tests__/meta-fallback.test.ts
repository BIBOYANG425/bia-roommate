import { describe, it, expect } from "vitest";
import {
  metaFor,
  PARCEL_STATUS_META,
  UNKNOWN_PARCEL_STATUS_META,
  SHIPPING_METHOD_META,
  UNKNOWN_SHIPPING_METHOD_META,
} from "@/lib/types";

describe("metaFor — DB-sourced meta lookups never throw", () => {
  it("returns the real meta for a known parcel status", () => {
    expect(
      metaFor(PARCEL_STATUS_META, "arrived_us", UNKNOWN_PARCEL_STATUS_META),
    ).toBe(PARCEL_STATUS_META.arrived_us);
  });

  it("returns the fallback for an unknown parcel status", () => {
    expect(
      metaFor(
        PARCEL_STATUS_META,
        "some_future_status",
        UNKNOWN_PARCEL_STATUS_META,
      ),
    ).toBe(UNKNOWN_PARCEL_STATUS_META);
  });

  it("returns the real meta for a known shipping method", () => {
    expect(
      metaFor(SHIPPING_METHOD_META, "sea", UNKNOWN_SHIPPING_METHOD_META),
    ).toBe(SHIPPING_METHOD_META.sea);
  });

  it("returns the fallback for null / undefined keys", () => {
    expect(
      metaFor(SHIPPING_METHOD_META, null, UNKNOWN_SHIPPING_METHOD_META),
    ).toBe(UNKNOWN_SHIPPING_METHOD_META);
    expect(
      metaFor(SHIPPING_METHOD_META, undefined, UNKNOWN_SHIPPING_METHOD_META),
    ).toBe(UNKNOWN_SHIPPING_METHOD_META);
  });

  it("always yields a renderable neutral label/pill for unknown values", () => {
    const status = metaFor(
      PARCEL_STATUS_META,
      "???",
      UNKNOWN_PARCEL_STATUS_META,
    );
    expect(status.label).toBeTruthy();
    // Fallback tone must be a real tone the pill can style.
    expect(status.tone).toBe("pending");

    const method = metaFor(
      SHIPPING_METHOD_META,
      "hyperloop",
      UNKNOWN_SHIPPING_METHOD_META,
    );
    expect(method.label).toBeTruthy();
    expect(method.icon).toBeTruthy();
  });
});
