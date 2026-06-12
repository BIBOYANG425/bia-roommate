"use client";

import { Suspense } from "react";
import ProductShell from "@/components/ProductShell";

export default function UscGroupPage() {
  return (
    <Suspense>
      <ProductShell group="community" page="usc-group">
        {() => (
          <main className="flex min-h-screen flex-col">
            <iframe
              src="/usc-group.html"
              className="w-full flex-1 border-none"
              style={{ minHeight: "calc(100vh - 64px)" }}
              title="USC 新生群"
            />
          </main>
        )}
      </ProductShell>
    </Suspense>
  );
}
