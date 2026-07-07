import { describe, it, expect } from "vitest";
import {
  INITIAL_PROFILE_FORM,
  validateProfileForm,
  buildProfilePayload,
  type ProfileFormData,
} from "@/hooks/useProfileForm";

function form(overrides: Partial<ProfileFormData> = {}): ProfileFormData {
  // Base form has the default-required `name` filled so the tests below
  // isolate the contact requirement.
  return { ...INITIAL_PROFILE_FORM, name: "Bobby", ...overrides };
}

describe("validateProfileForm — contact requirement (dead submit fix)", () => {
  it("is valid with a legacy `contact` value only (no channels)", () => {
    expect(
      validateProfileForm(form({ contact: "wx: bobby", contactChannels: [] })),
    ).toBe(true);
  });

  it("is invalid with neither a legacy `contact` nor any channel", () => {
    expect(
      validateProfileForm(form({ contact: "", contactChannels: [] })),
    ).toBe(false);
  });

  it("is valid with a structured channel only (no legacy `contact`)", () => {
    expect(
      validateProfileForm(
        form({
          contact: "",
          contactChannels: [{ platform: "wechat", value: "bobby123" }],
        }),
      ),
    ).toBe(true);
  });

  it("ignores channels whose value is blank", () => {
    expect(
      validateProfileForm(
        form({
          contact: "",
          contactChannels: [{ platform: "wechat", value: "   " }],
        }),
      ),
    ).toBe(false);
  });

  it("still enforces required text fields", () => {
    expect(
      validateProfileForm(form({ name: "", contact: "wx: bobby" }), ["name"]),
    ).toBe(false);
  });

  it("matches the legacy /submit call signature (name + contact required)", () => {
    // /submit passes ["name", "contact"] and only writes the legacy field.
    expect(
      validateProfileForm(form({ contact: "wx: bobby", contactChannels: [] }), [
        "name",
        "contact",
      ]),
    ).toBe(true);
  });
});

describe("buildProfilePayload — visibility (sanctioned change)", () => {
  it("sets visible: true for freshmen", () => {
    expect(buildProfilePayload(form({ year: "新生" }), null).visible).toBe(true);
  });

  it("sets visible: true for non-freshmen (previously hidden)", () => {
    expect(buildProfilePayload(form({ year: "大二" }), null).visible).toBe(true);
  });
});
