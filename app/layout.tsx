import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans">
        {children}
      </body>
    </html>
  );
}
