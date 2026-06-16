import { describe, it, expect, afterEach } from "vitest";
import { buildGeorgeImessageLink } from "../george-link";

afterEach(() => { delete process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE; });

describe("buildGeorgeImessageLink", () => {
  it("builds a prefilled sms deep-link when the phone is configured", () => {
    process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE = "+13105551234";
    const link = buildGeorgeImessageLink("拼车局 K-town");
    expect(link).toContain("sms:+13105551234");
    expect(link).toContain(encodeURIComponent("我想加入 拼车局 K-town"));
  });
  it("returns null when the phone is unset (UI falls back to plain text)", () => {
    expect(buildGeorgeImessageLink("x")).toBeNull();
  });
});
