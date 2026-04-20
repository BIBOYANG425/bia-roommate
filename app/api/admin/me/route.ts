// /api/admin/me
// GET — returns the current viewer's admin status. Non-sensitive; used by
// client-side shells (AdminShell, NavTabs) to decide whether to render the
// admin nav. Real gating still happens on individual admin endpoints.

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/admin";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ isAdmin: false, email: null }, { status: 200 });
  }
  return NextResponse.json({
    isAdmin: ctx.isAdmin,
    email: ctx.user.email ?? null,
  });
}
