import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import FeedbackButton from "@/components/FeedbackButton";
import { SITE, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const playlistScript = localFont({
  src: "../public/fonts/Playlist-Script.otf",
  variable: "--font-playlist",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const interFont = Inter({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-en",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s | BIA" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "BIA",
    "Bridging Internationals Association",
    "USC international students",
    "USC Chinese students",
    "USC student community",
    "USC apartments",
    "USC course planner",
    "USC roommates",
  ],
  authors: [{ name: SITE.fullName }],
  creator: SITE.fullName,
  publisher: SITE.fullName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.fullName,
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    locale: "zh_CN",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#990000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${bebasNeue.variable} ${interFont.variable} ${instrumentSerif.variable} ${playlistScript.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd()),
          }}
        />
        <LanguageProvider>
          <AuthProvider>
            {children}
            <FeedbackButton />
          </AuthProvider>
        </LanguageProvider>
        {/* Film grain overlay */}
        <div className="grain" aria-hidden="true" />
        {/* Vercel Web Analytics + PostHog are separate sinks. PostHog no-ops
            entirely when NEXT_PUBLIC_POSTHOG_KEY is unset (see posthog-sink). */}
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
