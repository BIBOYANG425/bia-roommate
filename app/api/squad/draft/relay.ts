// app/api/squad/draft/relay.ts
// Extracted relay logic for george /squad/draft endpoint — kept outside
// route.ts so it can be unit-tested without violating the Next.js 16
// route-export whitelist (only HTTP method handlers + config allowed).

export async function relayDraft(
  text: string
): Promise<{ status: number; body: unknown }> {
  const backendUrl = process.env.GEORGE_BACKEND_URL;
  const adminToken = process.env.GEORGE_ADMIN_TOKEN;

  if (!backendUrl || !adminToken) {
    return { status: 503, body: { error: "unavailable" } };
  }

  let res: Response;
  try {
    res = await fetch(`${backendUrl}/squad/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Network failure, timeout (AbortError), or any thrown fetch error
    return { status: 502, body: { error: "draft_unavailable" } };
  }

  if (res.status === 422) {
    const body = await res.json().catch(() => ({ error: "unsupported_category" }));
    return { status: 422, body };
  }

  if (!res.ok) {
    return { status: 502, body: { error: "draft_unavailable" } };
  }

  const data = await res.json().catch(() => null);
  return { status: 200, body: { draft: data?.draft ?? data } };
}
