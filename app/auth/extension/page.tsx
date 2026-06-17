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
