// Generic labeled form field wrapper. Reused across admin pages so inputs
// share one label style. Extract from inline use in app/shipping/admin/page.tsx.

import type { ReactNode } from "react";

export default function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="font-display text-[10px] tracking-wider block mb-1"
        style={{ color: "var(--mid)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
