// Helpers for the /auth/extension hand-off page. The extension launches
// chrome.identity.launchWebAuthFlow with a redirect_uri of
// https://<extension-id>.chromiumapp.org/ — the only place we will ever hand a
// Supabase session, gated by the configured extension id. Tokens travel in the
// URL fragment so they are never sent to a server or leaked via Referer.
//
// Header last reviewed: 2026-06-17

/** True only if `uri` is the chromiumapp.org redirect for the allowed extension. */
export function isValidExtensionRedirect(
  uri: string | null,
  extensionId: string | undefined,
): boolean {
  if (!uri || !extensionId) return false;
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === `${extensionId}.chromiumapp.org`
  );
}

/** Append the Supabase session to the redirect URL's fragment for the extension. */
export function buildExtensionRedirectUrl(
  redirectUri: string,
  session: { access_token: string; refresh_token: string; expires_at: number },
): string {
  const frag = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: String(session.expires_at),
  });
  return `${redirectUri}#${frag.toString()}`;
}
