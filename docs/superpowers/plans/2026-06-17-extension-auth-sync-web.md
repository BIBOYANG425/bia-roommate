# Extension Auth Sync — Web API Plan (Plan A of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the web API authenticate a request by a Supabase **Bearer token** (in addition to the cookie session) and add the `/auth/extension` page that hands a signed-in session to the Chrome extension — the server-side prerequisites the extension (Plan B) will call.

**Architecture:** Add bearer-token auth resolution next to the existing cookie auth so every `authedHandler` route (incl. `/api/schedules`) works for the extension unchanged. Add a security-gated `/auth/extension` page that, after the user signs in on the real site, redirects the Supabase access+refresh tokens to the extension via the URL fragment of its `chromiumapp.org` redirect.

**Tech Stack:** Next.js 16 (App Router), `@supabase/supabase-js` + `@supabase/ssr`, Vitest. Repo: `bia-roommate`. Branch: `feat/extension-auth-sync` (spec already committed there).

**Scope note:** This is **Plan A of 2**. Plan B (the extension: `launchWebAuthFlow`, manifest `identity`, Save/My-Schedules UI) is written after Plan A lands and deploys, so the extension builds against a live API. Spec: `docs/superpowers/specs/2026-06-17-extension-auth-sync-design.md`.

**Local test runner caveat:** this checkout's deps are relocated under `node_modules/.ignored/`, so `npx vitest`/`pnpm test` are broken locally. Run a test file with:
`NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run <path>`
(ignore the harmless "Module not found vitest/config" warning). CI runs vitest normally.

---

### Task 1: Bearer token helpers (`lib/supabase/bearer.ts`)

**Files:**
- Create: `lib/supabase/bearer.ts`
- Test: `lib/supabase/__tests__/bearer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/supabase/__tests__/bearer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getBearerToken } from "../bearer";

function req(headers: Record<string, string>): Request {
  return new Request("https://x/api", { headers });
}

describe("getBearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(getBearerToken(req({ Authorization: "Bearer abc.def.ghi" }))).toBe("abc.def.ghi");
  });
  it("is case-insensitive on the scheme", () => {
    expect(getBearerToken(req({ authorization: "bearer xyz" }))).toBe("xyz");
  });
  it("returns null when there is no Authorization header", () => {
    expect(getBearerToken(req({}))).toBeNull();
  });
  it("returns null for a non-Bearer scheme", () => {
    expect(getBearerToken(req({ Authorization: "Basic abc" }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/supabase/__tests__/bearer.test.ts`
Expected: FAIL — cannot resolve `../bearer`.

- [ ] **Step 3: Write the implementation**

Create `lib/supabase/bearer.ts`:

```ts
// Bearer-token Supabase auth for non-cookie clients (the Chrome extension).
// The extension holds a Supabase access token and sends it as
// `Authorization: Bearer <jwt>`. createBearerSupabaseClient builds a stateless
// client whose requests carry that token so RLS auth.uid() resolves — the
// bearer counterpart of the cookie client used on the web.
//
// Header last reviewed: 2026-06-17

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Extract a Bearer token from the request's Authorization header, or null. */
export function getBearerToken(request: Request): string | null {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Stateless Supabase client whose requests carry the given user access token. */
export function createBearerSupabaseClient(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/supabase/__tests__/bearer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/bearer.ts lib/supabase/__tests__/bearer.test.ts
git commit -m "feat(api): bearer-token Supabase helpers for extension auth"
```

---

### Task 2: Auth resolution (`lib/api/resolve-auth.ts`) + wire into `authedHandler`

**Files:**
- Create: `lib/api/resolve-auth.ts`
- Test: `lib/api/__tests__/resolve-auth.test.ts`
- Modify: `lib/api/authed-handler.ts:160-166`

- [ ] **Step 1: Write the failing test**

Create `lib/api/__tests__/resolve-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieGetUser = vi.fn();
const bearerGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: cookieGetUser } })),
}));
vi.mock("@/lib/supabase/bearer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../supabase/bearer")>()),
  createBearerSupabaseClient: vi.fn(() => ({ auth: { getUser: bearerGetUser } })),
}));

import { resolveAuth } from "../resolve-auth";

beforeEach(() => {
  cookieGetUser.mockReset();
  bearerGetUser.mockReset();
});

describe("resolveAuth", () => {
  it("resolves via the cookie session when there is no bearer token", async () => {
    cookieGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await resolveAuth(new Request("https://x/api"));
    expect(res?.user.id).toBe("u1");
    expect(bearerGetUser).not.toHaveBeenCalled();
  });
  it("resolves via the bearer token when present", async () => {
    bearerGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    const res = await resolveAuth(
      new Request("https://x/api", { headers: { Authorization: "Bearer tok" } }),
    );
    expect(res?.user.id).toBe("u2");
    expect(bearerGetUser).toHaveBeenCalledWith("tok");
    expect(cookieGetUser).not.toHaveBeenCalled();
  });
  it("returns null when the bearer token is invalid", async () => {
    bearerGetUser.mockResolvedValue({ data: { user: null } });
    const res = await resolveAuth(
      new Request("https://x/api", { headers: { Authorization: "Bearer bad" } }),
    );
    expect(res).toBeNull();
  });
  it("returns null when the cookie session has no user", async () => {
    cookieGetUser.mockResolvedValue({ data: { user: null } });
    expect(await resolveAuth(new Request("https://x/api"))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/api/__tests__/resolve-auth.test.ts`
Expected: FAIL — cannot resolve `../resolve-auth`.

- [ ] **Step 3: Write the implementation**

Create `lib/api/resolve-auth.ts`:

```ts
// Resolve the requesting user from either a Supabase Bearer token (the Chrome
// extension) or the cookie session (the web), returning the user plus a
// Supabase client bound to that identity so RLS works on reads/writes.
//
// Header last reviewed: 2026-06-17

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBearerToken, createBearerSupabaseClient } from "@/lib/supabase/bearer";

export async function resolveAuth(
  request: Request,
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const token = getBearerToken(request);
  if (token) {
    const supabase = createBearerSupabaseClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return user ? { user, supabase } : null;
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/api/__tests__/resolve-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `authedHandler` to use `resolveAuth`**

In `lib/api/authed-handler.ts`, add to the imports (after line 19):

```ts
import { resolveAuth } from "@/lib/api/resolve-auth";
```

Replace the cookie-only auth block (lines 160-166):

```ts
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

with:

```ts
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = auth;
```

(`createServerSupabaseClient` is still imported and used by `adminHandler` paths elsewhere — leave the import.)

- [ ] **Step 6: Typecheck**

Run: `node node_modules/.ignored/typescript/bin/tsc --noEmit`
Expected: no NEW errors in `lib/api/authed-handler.ts` or `lib/api/resolve-auth.ts` (pre-existing broken-install errors about missing `react`/`@types` are unrelated).

- [ ] **Step 7: Commit**

```bash
git add lib/api/resolve-auth.ts lib/api/__tests__/resolve-auth.test.ts lib/api/authed-handler.ts
git commit -m "feat(api): authedHandler accepts bearer token or cookie session"
```

---

### Task 3: CORS — allow `Authorization` + `OPTIONS` preflight on `/api/schedules`

**Files:**
- Modify: `lib/cors.ts:19`
- Modify: `app/api/schedules/route.ts`
- Test: `lib/__tests__/cors.test.ts`

(The extension's save/load go through its background service worker, which bypasses CORS via `host_permissions`; this is defense-in-depth so a future popup-direct fetch and preflight work.)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/cors.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { corsHeaders } from "../cors";

describe("corsHeaders", () => {
  const prev = process.env.ALLOWED_EXTENSION_ID;
  beforeEach(() => {
    process.env.ALLOWED_EXTENSION_ID = "testextid";
  });
  afterEach(() => {
    process.env.ALLOWED_EXTENSION_ID = prev;
  });

  it("allows the configured extension origin and permits the Authorization header", () => {
    const req = new Request("https://x/api/schedules", {
      headers: { origin: "chrome-extension://testextid" },
    });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("chrome-extension://testextid");
    expect(h["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("returns no headers for a disallowed origin", () => {
    const req = new Request("https://x/api/schedules", {
      headers: { origin: "https://evil.example" },
    });
    expect(corsHeaders(req)).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/__tests__/cors.test.ts`
Expected: FAIL — `Access-Control-Allow-Headers` is `"Content-Type"`, does not contain `Authorization`.

- [ ] **Step 3: Add `Authorization` to the allowed headers**

In `lib/cors.ts`, change line 19 from:

```ts
    "Access-Control-Allow-Headers": "Content-Type",
```

to:

```ts
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/__tests__/cors.test.ts`
Expected: PASS.

- [ ] **Step 5: Add an `OPTIONS` handler to the schedules route**

In `app/api/schedules/route.ts`, add to the imports at the top:

```ts
import { handleOptions } from "@/lib/cors";
```

Add at the end of the file:

```ts
export function OPTIONS(request: Request) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `node node_modules/.ignored/typescript/bin/tsc --noEmit`
Expected: no new errors in the two files.

```bash
git add lib/cors.ts lib/__tests__/cors.test.ts app/api/schedules/route.ts
git commit -m "feat(api): allow Authorization header + OPTIONS preflight on /api/schedules"
```

---

### Task 4: Extension redirect helpers (`lib/auth/extension-redirect.ts`)

**Files:**
- Create: `lib/auth/extension-redirect.ts`
- Test: `lib/auth/__tests__/extension-redirect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/auth/__tests__/extension-redirect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  isValidExtensionRedirect,
  buildExtensionRedirectUrl,
} from "../extension-redirect";

describe("isValidExtensionRedirect", () => {
  const extId = "abcdefghijklmnop";
  it("accepts the allowed extension's chromiumapp.org redirect", () => {
    expect(isValidExtensionRedirect(`https://${extId}.chromiumapp.org/`, extId)).toBe(true);
  });
  it("rejects a different extension id", () => {
    expect(isValidExtensionRedirect("https://other.chromiumapp.org/", extId)).toBe(false);
  });
  it("rejects a non-chromiumapp host", () => {
    expect(isValidExtensionRedirect(`https://${extId}.evil.com/`, extId)).toBe(false);
  });
  it("rejects http (non-https)", () => {
    expect(isValidExtensionRedirect(`http://${extId}.chromiumapp.org/`, extId)).toBe(false);
  });
  it("rejects null uri or missing extension id", () => {
    expect(isValidExtensionRedirect(null, extId)).toBe(false);
    expect(isValidExtensionRedirect(`https://${extId}.chromiumapp.org/`, undefined)).toBe(false);
  });
});

describe("buildExtensionRedirectUrl", () => {
  it("puts the session tokens in the URL fragment", () => {
    const url = buildExtensionRedirectUrl("https://ext.chromiumapp.org/", {
      access_token: "at",
      refresh_token: "rt",
      expires_at: 1234,
    });
    expect(url.startsWith("https://ext.chromiumapp.org/#")).toBe(true);
    const frag = new URLSearchParams(url.split("#")[1]);
    expect(frag.get("access_token")).toBe("at");
    expect(frag.get("refresh_token")).toBe("rt");
    expect(frag.get("expires_at")).toBe("1234");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/auth/__tests__/extension-redirect.test.ts`
Expected: FAIL — cannot resolve `../extension-redirect`.

- [ ] **Step 3: Write the implementation**

Create `lib/auth/extension-redirect.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `NODE_PATH=node_modules/.ignored node node_modules/.ignored/vitest/vitest.mjs run lib/auth/__tests__/extension-redirect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/extension-redirect.ts lib/auth/__tests__/extension-redirect.test.ts
git commit -m "feat(auth): redirect validation + token-fragment builder for extension hand-off"
```

---

### Task 5: `/auth/extension` hand-off page

**Files:**
- Create: `app/auth/extension/page.tsx`
- Env: add `NEXT_PUBLIC_ALLOWED_EXTENSION_ID` (public copy of `ALLOWED_EXTENSION_ID`, = the published extension id) to `.env.local` and Vercel.

No unit test (no React component-test infra; the page is glue over the Task-4 helpers, which are tested). Verify by typecheck + manual.

- [ ] **Step 1: Add the public env var**

Add to `.env.local` (and Vercel project env) — value is the extension's id, not secret:

```
NEXT_PUBLIC_ALLOWED_EXTENSION_ID=<published-extension-id>
```

- [ ] **Step 2: Create the page**

Create `app/auth/extension/page.tsx`:

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  isValidExtensionRedirect,
  buildExtensionRedirectUrl,
} from "@/lib/auth/extension-redirect";

function ExtensionAuthInner() {
  const params = useSearchParams();
  const redirectUri = params.get("redirect_uri");
  const { user, signIn } = useAuth();
  const valid = isValidExtensionRedirect(
    redirectUri,
    process.env.NEXT_PUBLIC_ALLOWED_EXTENSION_ID,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once signed in (and the redirect is trusted), hand the session to the extension.
  useEffect(() => {
    if (!user || !valid || !redirectUri) return;
    let cancelled = false;
    createBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled || !session) return;
        window.location.href = buildExtensionRedirectUrl(redirectUri, {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ?? 0,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, valid, redirectUri]);

  if (!valid) {
    return (
      <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
        <h1>Invalid request</h1>
        <p>This sign-in link did not come from the BIA Course Helper extension.</p>
      </main>
    );
  }

  if (user) {
    return (
      <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
        <p>Signed in. Returning to the extension…</p>
      </main>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
    // On success `user` updates and the effect above performs the redirect.
  };

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1>Sign in to BIA</h1>
      <p>Sign in to connect the BIA Course Helper extension to your account.</p>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <input
          type="email"
          placeholder="School email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </form>
    </main>
  );
}

export default function ExtensionAuthPage() {
  return (
    <Suspense>
      <ExtensionAuthInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `node node_modules/.ignored/typescript/bin/tsc --noEmit`
Expected: no new errors in `app/auth/extension/page.tsx` (ignore the pre-existing broken-install `react`/JSX errors that affect every `.tsx`).

- [ ] **Step 4: Manual verification**

Run `pnpm dev` (or check on the deployed preview). Visit
`/auth/extension?redirect_uri=https://<ext-id>.chromiumapp.org/`:
- With a bad `redirect_uri` (e.g. `https://evil.com/`) → shows "Invalid request", no token hand-off.
- Signed out → shows the sign-in form; after signing in, the browser navigates to the `chromiumapp.org` URL with `#access_token=…&refresh_token=…&expires_at=…`.

- [ ] **Step 5: Commit**

```bash
git add app/auth/extension/page.tsx
git commit -m "feat(auth): /auth/extension session hand-off page for the extension"
```

---

## Self-Review

**Spec coverage (web portion of the spec):**
- Bearer-token auth on `authedHandler` → Tasks 1–2. ✓
- CORS `Authorization` + `OPTIONS` on `/api/schedules` → Task 3. ✓
- `/auth/extension` page with `redirect_uri` security gate + fragment hand-off → Tasks 4–5. ✓
- Save/load endpoints — no change needed; `/api/schedules` POST/GET already exist and now accept bearer auth via Task 2. ✓
- Extension side (auth module, manifest, Settings, Save, My Schedules) → **Plan B** (separate, after this lands). ✓

**Type consistency:** `getBearerToken`/`createBearerSupabaseClient` (Task 1) are consumed by `resolveAuth` (Task 2); `isValidExtensionRedirect`/`buildExtensionRedirectUrl` (Task 4) are consumed by the page (Task 5) with matching signatures (`session: {access_token, refresh_token, expires_at:number}`). `resolveAuth` returns `{user, supabase}` exactly matching what `authedHandler` destructures.

**Placeholder scan:** none — every code step has complete code and exact commands. The page's minimal inline styling is intentional (functional hand-off page; can adopt the design system later, out of scope here).

**Behavior preservation:** the web cookie path through `resolveAuth` returns the same `{user, supabase}` as the old inline code, so existing routes are unaffected; bearer is purely additive.
