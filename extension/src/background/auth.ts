// Chrome-side auth module. Drives the launchWebAuthFlow login against the web
// app's /auth/extension page, stores the Supabase session in chrome.storage,
// and exposes a valid access token + the signed-in email. The pure
// parse/expiry/email logic lives in ../shared/session (unit-tested).
//
// Header last reviewed: 2026-06-17

import { BIA_API_BASE } from "../shared/constants";
import {
  parseSessionFromRedirectUrl,
  isSessionExpired,
  decodeJwtEmail,
  type StoredSession,
} from "../shared/session";

const SESSION_KEY = "bia:session";

function authUrl(): string {
  const redirectUri = chrome.identity.getRedirectURL();
  return `${BIA_API_BASE}/auth/extension?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

async function storeSession(session: StoredSession): Promise<void> {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const data = await chrome.storage.local.get(SESSION_KEY);
  return (data[SESSION_KEY] as StoredSession | undefined) ?? null;
}

// Run launchWebAuthFlow and persist the returned session. interactive=false
// resolves silently only when the web session cookie is still alive (no login
// UI needed); otherwise it rejects, and the caller can retry interactively.
async function runAuthFlow(interactive: boolean): Promise<StoredSession | null> {
  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl(),
    interactive,
  });
  if (!redirectUrl) return null;
  const session = parseSessionFromRedirectUrl(redirectUrl);
  if (session) await storeSession(session);
  return session;
}

// launchWebAuthFlow rejects with "The user did not approve access." (and
// similar) when the user closes/cancels the auth window. That's not an error —
// it just means no sign-in happened, so we don't want to surface it as one.
function isUserCancelled(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /did not approve|cancell?ed|closed by the user/i.test(msg);
}

/** Interactive sign-in (shows the auth window). Returns the signed-in email,
 *  or null if the user cancelled. */
export async function signIn(): Promise<string | null> {
  let session: StoredSession | null = null;
  try {
    session = await runAuthFlow(true);
  } catch (err) {
    if (isUserCancelled(err)) return null;
    throw err;
  }
  return session ? decodeJwtEmail(session.access_token) : null;
}

export async function signOut(): Promise<void> {
  await chrome.storage.local.remove(SESSION_KEY);
}

/** The signed-in email, or null if not signed in. */
export async function getEmail(): Promise<string | null> {
  const session = await getStoredSession();
  return session ? decodeJwtEmail(session.access_token) : null;
}

/** A non-expired access token, attempting a silent re-auth if expired. Null if
 *  the user must sign in interactively. */
export async function getValidAccessToken(): Promise<string | null> {
  const session = await getStoredSession();
  const nowSec = Math.floor(Date.now() / 1000);
  if (session && !isSessionExpired(session, nowSec)) return session.access_token;
  try {
    const refreshed = await runAuthFlow(false);
    return refreshed ? refreshed.access_token : null;
  } catch {
    return null;
  }
}
