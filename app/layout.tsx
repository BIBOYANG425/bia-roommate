import type { Metadata } from "next";
import {
  Bebas_Neue,
  Inter,
  Instrument_Serif,
  ZCOOL_XiaoWei,
} from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

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

const zcoolXiaoWei = ZCOOL_XiaoWei({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-zh",
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
      className={`${bebasNeue.variable} ${interFont.variable} ${instrumentSerif.variable} ${zcoolXiaoWei.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
        {/* Film grain overlay */}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
