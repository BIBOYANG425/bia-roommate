// CORS helper for Chrome extension API routes
// Background service worker with host_permissions bypasses CORS,
// but this is defense-in-depth for direct popup/content script fetches.

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";

  const isAllowed =
    origin.startsWith("chrome-extension://") ||
    origin === "https://bia-roommate.vercel.app";

  if (!isAllowed) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;

  const headers = corsHeaders(request);
  if (Object.keys(headers).length === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204, headers });
}
