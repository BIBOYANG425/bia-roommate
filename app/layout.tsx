import type { Metadata } from "next";
import { Bebas_Neue, Inter, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/AuthProvider";
import FeedbackButton from "@/components/FeedbackButton";
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
  title: "BIA | Bridging Internationals Association",
  description:
    "USC international student community — cultural bridge-building, tech & innovation, career development. Est. 2024.",
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
        <AuthProvider>
          {children}
          <FeedbackButton />
        </AuthProvider>
        {/* Film grain overlay */}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
