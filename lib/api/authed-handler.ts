// Authed-route middleware: auth + rate-limit + zod body validation + uniform
// errors. Wrap a route's HTTP handler so the route file only contains the
// business logic. Designed for Next.js 16 App Router (route files can only
// export HTTP method handlers — helpers must live in lib/).
//
//   export const POST = authedHandler({
//     schema: z.object({ profile_id: z.string().uuid() }),
//     rateLimit: { key: "likes", limit: 30, windowMs: 60_000 },
//     handler: async ({ user, supabase, body }) => { ... },
//   });
//
// For admin-only routes, use adminHandler — it gates on requireAdmin() and
// exposes a service-role client alongside the user's anon client.
// Header last reviewed: 2026-06-17

import { NextResponse } from "next/server";
import type { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuth } from "@/lib/api/resolve-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import {
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "@/lib/rate-limit";

type InferBody<S> = S extends z.ZodTypeAny ? z.infer<S> : null;

export type AuthedCtx<S extends z.ZodTypeAny | undefined, P> = {
  user: User;
  supabase: SupabaseClient;
  body: InferBody<S>;
  request: Request;
  params: P;
};

export type AdminCtx<S extends z.ZodTypeAny | undefined, P> = AuthedCtx<
  S,
  P
> & {
  adminSupabase: SupabaseClient;
};

export type RateLimitOpts = {
  key: string;
  /** Optional custom message for the 429 body. Defaults to "Too many requests". */
  message?: string;
} & RateLimitConfig;

type CommonOpts<S extends z.ZodTypeAny | undefined> = {
  schema?: S;
  rateLimit?: RateLimitOpts;
};

type AuthedOpts<S extends z.ZodTypeAny | undefined, P> = CommonOpts<S> & {
  handler: (ctx: AuthedCtx<S, P>) => Promise<Response>;
};

type AdminOpts<S extends z.ZodTypeAny | undefined, P> = CommonOpts<S> & {
  handler: (ctx: AdminCtx<S, P>) => Promise<Response>;
};

// Next.js 16 enforces a strict route handler signature via the auto-generated
// types in .next/types/. The second arg is { params: Promise<...> } and must
// be REQUIRED (no `| undefined`) for both dynamic and non-dynamic routes —
// Next.js passes an empty-params object for non-dynamic routes.
type RouteContext<P> = { params: Promise<P> };

function rateLimitResponse(rl: RateLimitResult, message?: string): Response {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((rl.resetAt - Date.now()) / 1000),
  );
  return NextResponse.json(
    { error: message ?? "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    },
  );
}

async function parseBody(
  request: Request,
  schema: z.ZodTypeAny | undefined,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  if (!schema || request.method === "GET" || request.method === "HEAD") {
    return { ok: true, data: null };
  }
  // Treat missing/empty body as `null` so the schema gets a chance to produce
  // a field-specific 400 (e.g. "profile_id is required") instead of the user
  // seeing "Invalid JSON" when the schema validation would have been clearer.
  let raw: unknown = null;
  const text = await request.text();
  if (text.trim() !== "") {
    try {
      raw = JSON.parse(text);
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
      };
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Hoist the first zod issue message into `error` so frontends that read
    // `data.error` still see something actionable (e.g. "Term cannot be more
    // than one year in the future") instead of a generic envelope. Keep the
    // full `issues` for richer client handling.
    const flat = parsed.error.flatten();
    const firstFieldError = Object.values(flat.fieldErrors)
      .flat()
      .find((m): m is string => typeof m === "string");
    const firstFormError = flat.formErrors[0];
    const message = firstFieldError ?? firstFormError ?? "Invalid request body";
    return {
      ok: false,
      response: NextResponse.json(
        { error: message, issues: flat },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

function runRateLimit(
  opts: RateLimitOpts | undefined,
  userId: string,
): Response | null {
  if (!opts) return null;
  const { key, message, ...cfg } = opts;
  const rl = checkRateLimit(`${key}:${userId}`, cfg);
  if (!rl.allowed) return rateLimitResponse(rl, message);
  return null;
}

async function resolveParams<P>(routeCtx: RouteContext<P>): Promise<P> {
  return await routeCtx.params;
}

/**
 * Wraps a route handler with auth + (optional) rate-limit + (optional) body
 * validation. Any signed-in user passes the gate.
 */
export function authedHandler<
  S extends z.ZodTypeAny | undefined = undefined,
  P = Record<string, never>,
>(opts: AuthedOpts<S, P>) {
  return async (
    request: Request,
    routeCtx: RouteContext<P>,
  ): Promise<Response> => {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, supabase } = auth;

    const rlResp = runRateLimit(opts.rateLimit, user.id);
    if (rlResp) return rlResp;

    const bodyResult = await parseBody(request, opts.schema);
    if (!bodyResult.ok) return bodyResult.response;

    const params = await resolveParams<P>(routeCtx);

    try {
      return await opts.handler({
        user,
        supabase,
        body: bodyResult.data as InferBody<S>,
        request,
        params,
      });
    } catch (err) {
      console.error("[authedHandler] uncaught:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wraps an admin-only route handler. Gates on requireAdmin() (401/403) and
 * exposes both the user's anon supabase client and a service-role admin
 * client. Use adminSupabase for queries/updates that must bypass RLS;
 * prefer supabase otherwise.
 */
export function adminHandler<
  S extends z.ZodTypeAny | undefined = undefined,
  P = Record<string, never>,
>(opts: AdminOpts<S, P>) {
  return async (
    request: Request,
    routeCtx: RouteContext<P>,
  ): Promise<Response> => {
    const gate = await requireAdmin();
    if (gate.error) return gate.error;

    const { user, supabase } = gate.ctx;

    const rlResp = runRateLimit(opts.rateLimit, user.id);
    if (rlResp) return rlResp;

    const bodyResult = await parseBody(request, opts.schema);
    if (!bodyResult.ok) return bodyResult.response;

    const params = await resolveParams<P>(routeCtx);

    try {
      return await opts.handler({
        user,
        supabase,
        adminSupabase: createAdminSupabaseClient(),
        body: bodyResult.data as InferBody<S>,
        request,
        params,
      });
    } catch (err) {
      console.error("[adminHandler] uncaught:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
