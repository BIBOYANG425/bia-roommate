import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

// trygeorge.app is a dedicated vanity domain for the George beta. It points at
// this same deployment, so map its root to the /georgebeta landing page.
// This is a rewrite (URL stays trygeorge.app), not a redirect. Deep links such
// as /george/chat keep working because they resolve on this deployment too.
const GEORGE_BETA_HOSTS = new Set(["trygeorge.app", "www.trygeorge.app"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (host && GEORGE_BETA_HOSTS.has(host) && pathname === "/") {
    return NextResponse.rewrite(new URL("/georgebeta", request.url));
  }

  // "/" is only matched so the trygeorge rewrite above can fire. On the normal
  // host the homepage reads no session, so skip the getUser() round-trip.
  if (pathname === "/") {
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

// Skip the Supabase getUser() refresh on static marketing routes that never
// read the session (about/events/blog/faq/terms/sponsors/team/contact and the
// homepage — the latter handled in-function above so its trygeorge rewrite is
// preserved). Every auth-gated surface (account/onboarding/roommates/shipping/
// apartments/sublet/api/auth/submit/…) still runs updateSession, so sessions
// keep refreshing there. Existing static-asset and /george exclusions retained.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|schools/|icons/|george|api/george|about|events|blog|faq|terms|sponsors|team|contact).*)",
  ],
};
