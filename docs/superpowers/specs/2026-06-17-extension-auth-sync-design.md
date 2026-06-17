# Chrome Extension — Login + Saved-Schedule Sync

**Date:** 2026-06-17
**Status:** Approved design (pre-implementation)
**Repo:** bia-roommate (uscbia.com + `extension/`)
**Reference:** github.com/jonluca/USC-Class-Notifier-API (core pattern: one shared backend, a portable identity token held by the extension, data-of-record stored server-side keyed by user)

## Problem

The Chrome extension (`BIA Course Helper`, MV3) is fully decoupled from user accounts:
- **No login** — anonymous; no `chrome.identity`, no token.
- **Save is local-only** — the popup schedule optimizer writes `savedCourseCodes` to `chrome.storage.local` and never calls the web API.

The web app already has everything needed on the server side: Supabase email+password auth, a `saved_schedules` table (`user_id` FK → `auth.users`, RLS user-scoped), and `POST`/`GET /api/schedules` behind `authedHandler`. It even pre-wires `chrome-extension://${ALLOWED_EXTENSION_ID}` in `lib/cors.ts`. The gap is purely: the extension has no identity and the API only reads cookie sessions.

## Goal

Let a user sign in from the extension and have their saved schedules sync with the web account — the extension can save a built schedule to their account and list their saved schedules, sharing the exact `saved_schedules` rows the web planner uses.

## Non-goals (follow-ups)

- Porting the reference's WebReg "Closed" registration parsing or migrating to tRPC.
- Syncing live selections / course bin / settings (settings stay local).
- Chrome Web Store publishing / release ops.

## Design

### 1. Authentication — `launchWebAuthFlow`

No password ever touches the extension; it reuses the web login.

**New web route `app/auth/extension/page.tsx`:**
- Receives `?redirect_uri=<chromiumapp URL>`.
- **Security gate:** accept the value only if it equals `https://${ALLOWED_EXTENSION_ID}.chromiumapp.org/` (the chrome.identity virtual redirect for the known extension). Reject anything else — no token hand-off to unknown origins.
- If there is no Supabase session, render the existing web login. After login the user has a session cookie.
- Once a session exists, read `supabase.auth.getSession()` and client-side redirect to
  `${redirect_uri}#access_token=…&refresh_token=…&expires_at=…`.
  Tokens ride in the URL **fragment** (never sent to a server), and Chrome intercepts the chromiumapp redirect and delivers it only to the extension.

**Extension auth module (`extension/src/popup/auth.ts`):**
1. `chrome.identity.launchWebAuthFlow({ url: '${baseDomain}/auth/extension?redirect_uri=' + chrome.identity.getRedirectURL(), interactive: true })`.
2. Parse the returned redirect fragment; store `{ access_token, refresh_token, expires_at }` in `chrome.storage.local` under `bia:session`.
3. **Refresh:** before an API call (or when `expires_at` is near), call Supabase GoTrue
   `POST ${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` (anon `apikey` + stored refresh token); update storage. On failure, clear the session and prompt re-login.
4. **Sign out:** clear `bia:session` (best-effort Supabase signout).

### 2. API bearer-token support

**`lib/api/authed-handler.ts`:** accept either auth.
- If an `Authorization: Bearer <jwt>` header is present, validate with `supabase.auth.getUser(jwt)` and build a Supabase client **bound to that token** so RLS `auth.uid()` resolves on reads/writes. Otherwise use today's cookie-session path unchanged.
- Every `authedHandler` route gains extension support; the web (cookie) flow is untouched.

**`lib/cors.ts` + `app/api/schedules/route.ts`:**
- `lib/cors.ts` already allows the extension origin; add `Authorization` to `Access-Control-Allow-Headers`.
- Add CORS headers + an `OPTIONS` handler to `/api/schedules`. No cookies/credentials needed (bearer only).

### 3. Save / load sync (reuse `saved_schedules`)

- **Save:** the popup `ScheduleOptimizer` gets a **"Save to BIA account"** button → `POST ${baseDomain}/api/schedules` with `Authorization: Bearer <access_token>` and the same body the web sends: `{ name, semester, courses, preferences, schedule_data }`. The extension maps its optimized sections into `schedule_data` via the shared `shared/course-types` types. On `401`: refresh once, retry; if still `401`, prompt re-login.
- **Load:** `GET ${baseDomain}/api/schedules` (bearer) → the user's saved schedules → a **"My Schedules"** list in the popup (name / semester / date). Viewing is baseline; "load into optimizer" is an optional stretch.
- **Identity:** the popup shows the signed-in email decoded from the JWT payload (no extra endpoint).

**Data flow:** extension → (bearer JWT) → `/api/schedules` → Supabase (RLS by `user_id`) → `saved_schedules` — the same rows the web planner reads/writes, so the two stay in sync by construction.

### 4. Extension UI surface

- **Settings tab:** "Sign in" when logged out; signed-in email + "Sign out" when logged in; the **My Schedules** list.
- **ScheduleOptimizer tab:** "Save to BIA account" button (enabled when signed in; prompts sign-in otherwise; "Saved ✓" on success).
- **Service worker** routes the auth + save/load messages (consistent with its existing fetch-router pattern), keeping tokens in the SW/storage, not in content scripts.

### 5. Manifest changes

- Add `"identity"` permission.
- Add host permission for the production web app (`https://uscbia.com/*`) alongside the existing `bia-roommate.vercel.app`.
- Add extension constants: `baseDomain` (API origin) and the **public** `SUPABASE_URL` + anon key (both already `NEXT_PUBLIC_*` in the web app) used only for the GoTrue token-refresh call.

## Error / edge handling

- Login canceled / window closed → quietly return to "Sign in" (no error spam).
- `redirect_uri` gate failure → the web page errors and hands back no tokens.
- Access token expired mid-use → silent refresh; refresh fails → clear session + prompt re-login.
- Save while signed out → prompt sign-in first.
- Offline / API 5xx → non-blocking "couldn't save, try again."
- Wrong extension id → `redirect_uri` gate rejects.

## Testing

- **Web (vitest):** `/auth/extension` `redirect_uri` validation (accept the allowed extension's chromiumapp.org, reject others); `authedHandler` bearer path (valid bearer → user, invalid → 401, cookie path still works) with mocked `supabase.auth.getUser`.
- **Extension (vitest):** auth module pure parts — token parse from the redirect fragment, storage get/set, refresh decision.
- **Manual E2E:** load unpacked → sign in via `launchWebAuthFlow` → build a schedule → save → confirm it appears in the web planner's saved schedules, and a web-saved schedule appears in "My Schedules."

## File structure

**Web:**
- Create: `app/auth/extension/page.tsx`
- Modify: `lib/api/authed-handler.ts` (bearer), `lib/cors.ts` (allow `Authorization`), `app/api/schedules/route.ts` (CORS + `OPTIONS`)

**Extension:**
- Create: `extension/src/popup/auth.ts`
- Modify: `extension/src/background/service-worker.ts` (auth + schedule messages), `extension/src/popup/components/Settings.tsx` (sign in/out + My Schedules), `extension/src/popup/components/ScheduleOptimizer.tsx` (Save button), `extension/manifest.json` (identity + host), extension constants (`baseDomain` + public `SUPABASE_URL`/anon key)

## Implementation order (suggested)

1. Web: `authedHandler` bearer support + `/api/schedules` CORS/OPTIONS + tests (no extension yet; testable server-side).
2. Web: `/auth/extension` page + `redirect_uri` gate + test.
3. Extension: auth module (`launchWebAuthFlow`, storage, refresh) + manifest `identity`/host + tests.
4. Extension: Settings sign-in/out + identity display.
5. Extension: "Save to BIA account" in ScheduleOptimizer (save path).
6. Extension: "My Schedules" list (load path).
