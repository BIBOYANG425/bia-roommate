// app/george/page.tsx
// Public landing page for george onboarding. Mints a code server-side and
// renders an sms: URL that opens the user's Messages app with the code prefilled.
//
// The "&body=" sms format is required on iOS 14+ for prefilled body. Do not
// change to "?body=" — that format is deprecated and breaks on some iOS versions.
// Header last reviewed: 2026-06-08
import { headers } from "next/headers";

async function mintCode(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const res = await fetch(`${proto}://${host}/george/api/code`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`code mint failed: ${res.status}`);
  const json = await res.json();
  return json.code as string;
}

export default async function GeorgeLanding() {
  const code = await mintCode();
  const phone = process.env.GEORGE_IMESSAGE_PHONE ?? "+1XXXXXXXXXX";
  const smsLink = `sms:${phone}&body=${encodeURIComponent(`i'm ready to try george (${code})`)}`;

  return (
    <div
      style={{
        background: "var(--cream)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 480, padding: "3rem", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3rem",
            fontStyle: "italic",
            color: "var(--cardinal)",
          }}
        >
          george
        </h1>
        <p style={{ color: "var(--mid)", marginTop: "1rem" }}>
          your bia agent. usc-savvy. lives in iMessage.
        </p>
        <a
          href={smsLink}
          style={{
            display: "inline-block",
            marginTop: "2rem",
            padding: "1rem 2rem",
            background: "var(--cardinal)",
            color: "var(--cream)",
            textDecoration: "none",
            borderRadius: "4px",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
          }}
        >
          Connect with george
        </a>
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.75rem",
            color: "var(--mid)",
          }}
        >
          opens iMessage with your code prepopulated. just hit send.
        </p>
      </div>
    </div>
  );
}
