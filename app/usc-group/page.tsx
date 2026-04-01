"use client";

import NavTabs from "@/components/NavTabs";

export default function UscGroupPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <NavTabs />
      <iframe
        src="/usc-group.html"
        className="flex-1 w-full border-none"
        style={{ minHeight: "calc(100vh - 50px)" }}
        title="USC 新生群"
      />
    </main>
  );
}
