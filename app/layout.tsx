import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BIA 新生找室友",
  description: "BIA 新生室友匹配平台，填写生活习惯，找到最合适的室友",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${bebasNeue.variable} ${spaceMono.variable}`}>
      <body>
        {children}
        {/* Film grain overlay */}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
