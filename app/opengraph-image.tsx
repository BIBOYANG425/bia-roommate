import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const alt = "BIA — Bridging Internationals Association";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social card for every page that doesn't define its own. Shown when
// a uscbia.com link is shared in iMessage / WeChat / Instagram / Twitter.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#990000",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 16,
            background: "#ffcc00",
          }}
        />
        <div style={{ fontSize: 180, fontWeight: 900, letterSpacing: -4 }}>
          BIA
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 8 }}>
          Bridging Internationals Association
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 24,
            color: "#ffcc00",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          USC international student community — culture, technology, careers.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          uscbia.com · Est. {SITE.foundingYear}
        </div>
      </div>
    ),
    { ...size },
  );
}
