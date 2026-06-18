"use client";

import { Suspense } from "react";
import ProductShell from "@/components/ProductShell";
import ComingSoon from "@/components/ComingSoon";
import { isComingSoon } from "@/lib/features";

export default function UscGroupPage() {
  if (isComingSoon("uscGroup")) {
    return <ComingSoon name={{ en: "USC New-Student Group", zh: "USC 新生群" }} />;
  }
  return (
    <Suspense>
      <ProductShell group="community" page="usc-group">
        {() => (
          <div className="flex flex-col">
            {/* Shell chrome: mobile 56px header + 80px bottom-nav padding; desktop 64px header. */}
            <iframe
              src="/usc-group.html"
              className="min-h-[calc(100vh-8.5rem)] w-full flex-1 border-none lg:min-h-[calc(100vh-4rem)]"
              title="USC 新生群"
            />
          </div>
        )}
      </ProductShell>
    </Suspense>
  );
}
