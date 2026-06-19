import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

// trygeorge.app is a dedicated vanity domain for the George beta. It points at
// this same deployment, so map its root to the /georgebeta landing page.
// This is a rewrite (URL stays trygeorge.app), not a redirect. Deep links such
// as /george/chat keep working because they resolve on this deployment too.
const GEORGE_BETA_HOSTS = new Set(["trygeorge.app", "www.trygeorge.app"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();

  if (host && GEORGE_BETA_HOSTS.has(host) && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/georgebeta", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|schools/|icons/|george|api/george).*)"],
};
