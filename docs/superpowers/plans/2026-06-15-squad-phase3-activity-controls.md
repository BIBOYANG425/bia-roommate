# Squad Phase 3 — Web Activity Hub + Receiving Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user, on the web, read/respond to their pings, see and edit the signals that feed matching, and control what they receive — without duplicating george's join logic.

**Architecture:** bia-admin ships one migration of 8 self-scoped `SECURITY DEFINER` RPCs (identity from `auth.uid()` via a shared `squad_resolve_me()` resolver, mirroring `squad_board_for_me`). bia-roommate adds a `我的` view on `/squad` (PINGS inbox + 我的局 + 已加入) calling those RPCs through `authedHandler` routes, and a `Squad 接收设置` section under `/account/george` (匹配依据 add/remove + receiving controls). The 加入 action records interest and hands off to george via a prefilled iMessage deep-link — no `squad_members` write on web. Two PRs, bia-admin first.

**Tech Stack:** Postgres/PLpgSQL (Supabase), pgvector, Next.js 16 App Router, React, Tailwind (`brutal-*`), zod, vitest, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-06-15-squad-phase3-activity-controls-design.md`

---

## File Structure

**bia-admin** (`~/Documents/BIA 新生service/bia-admin`)
- Create `supabase/migrations/20260615120000_squad_phase3_rpcs.sql` — `squad_resolve_me()` + 8 RPCs.
- Modify `lib/matching/__tests__/rpc.integration.test.ts` — add an authed-client harness + Phase 3 invariant tests (or a sibling `rpc.phase3.integration.test.ts`; this plan uses a sibling to keep diffs clean).
- Create `lib/matching/__tests__/rpc.phase3.integration.test.ts`.

**bia-roommate** (`~/Code/bia-roommate`)
- Create `app/api/squad/me/pings/route.ts`, `app/api/squad/me/pings/[id]/respond/route.ts`, `app/api/squad/me/posts/route.ts`, `app/api/squad/me/joined/route.ts`.
- Create `app/api/squad/prefs/route.ts`, `app/api/squad/signals/route.ts`.
- Create `lib/squad/ping-reason.ts`, `lib/squad/george-link.ts`, `lib/squad/me-types.ts` (shared response types).
- Create `components/squad/PingInbox.tsx`, `components/squad/MyActivity.tsx`.
- Create `app/account/george/_components/SquadSettingsSection.tsx` (+ inline `MatchSignals`, `ReceivingControls`).
- Modify `app/squad/page.tsx` — add a top-level `发现 | 我的` view toggle.
- Modify `app/account/george/page.tsx` — server-fetch prefs+signals, render `SquadSettingsSection`.
- Modify `.env.example` — `NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE`.
- Tests: `lib/squad/__tests__/ping-reason.test.ts`, `lib/squad/__tests__/george-link.test.ts`, `app/api/squad/me/pings/respond/parse.test.ts` (sibling helper), component tests under `components/squad/__tests__/`.

---

# PART A — bia-admin (PR 1)

> All work in `~/Documents/BIA 新生service/bia-admin`. **Run `pnpm install` ONCE before testing** (the store lock means never run concurrent installs — see the repo's test-env notes). DB tests run with `RUN_DB_TESTS=true pnpm exec vitest run <file>` and read `.env.local` for `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Task A1: Migration scaffold + `squad_resolve_me()` resolver

**Files:**
- Create: `supabase/migrations/20260615120000_squad_phase3_rpcs.sql`

- [ ] **Step 1: Write the migration header + the shared resolver**

`squad_resolve_me()` factors the `auth.uid() → students.id` JIT block out of `squad_board_for_me` so every Phase 3 RPC reuses it. It performs an INSERT on first call, so it is **volatile** (no `stable` marker).

```sql
-- supabase/migrations/20260615120000_squad_phase3_rpcs.sql
-- Squad Phase 3: self-scoped RPCs for the web activity hub + receiving controls.
-- Spec 2026-06-15-squad-phase3-activity-controls-design.md. Every function derives
-- identity from auth.uid() via squad_resolve_me() (never a parameter) and is
-- authenticated-callable; the matching tables stay deny-all RLS underneath.

-- Shared resolver: auth.uid() -> students.id, JIT-provisioning a row (race-safe via
-- students_user_id_uidx). Mirrors the block in squad_board_for_me (20260613000006).
create or replace function public.squad_resolve_me()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_auth uuid := auth.uid();
  v_student uuid;
begin
  if v_auth is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select id into v_student from students where user_id = v_auth;
  if v_student is null then
    begin
      insert into students (user_id, name)
      values (v_auth, coalesce(
        (select coalesce(raw_user_meta_data->>'full_name', email) from auth.users where id = v_auth),
        'USC student'))
      returning id into v_student;
    exception when unique_violation then
      select id into v_student from students where user_id = v_auth;
    end;
  end if;
  return v_student;
end;
$$;
revoke all on function public.squad_resolve_me() from public, anon;
grant execute on function public.squad_resolve_me() to authenticated, service_role;
```

- [ ] **Step 2: Commit**

```bash
cd ~/"Documents/BIA 新生service/bia-admin"
git checkout -b feat/squad-phase3-rpcs
git add supabase/migrations/20260615120000_squad_phase3_rpcs.sql
git commit -m "feat(squad-p3): migration scaffold + squad_resolve_me resolver"
```

### Task A2: Read RPCs — pings, posts, joined, prefs, signals

**Files:**
- Modify: `supabase/migrations/20260615120000_squad_phase3_rpcs.sql`

- [ ] **Step 1: Append the five read RPCs**

```sql
-- 1) Inbox: my DELIVERED pings (status='sent') + post info + recomputed reason.
-- Reason isn't persisted on squad_pings, so recompute matched_tags / best_facet here.
create or replace function public.squad_my_pings()
returns table (
  ping_id uuid, post_id uuid, category text, content text, location text,
  poster_name text, current_people int, max_people int, status text,
  score double precision, response text, responded_at timestamptz,
  created_at timestamptz, matched_tags text[], best_facet text
)
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  return query
  select sp.id, sp.post_id, ps.category, ps.content, ps.location, ps.poster_name,
         ps.current_people, ps.max_people, ps.status, sp.score, sp.response,
         sp.responded_at, sp.created_at,
         array(select unnest(ps.tags) intersect select unnest(st.interest_tags)),
         (select uiv.label from user_interest_vectors uiv
            where uiv.student_id = v_student and ps.embedding is not null
            order by uiv.vector <=> ps.embedding limit 1)
  from squad_pings sp
  join squad_posts_with_status ps on ps.id = sp.post_id
  join students st on st.id = v_student
  where sp.recipient_student_id = v_student and sp.status = 'sent'
  order by sp.created_at desc;
end;
$$;

-- 2) Organizer view: my posts + AGGREGATE reach_count (never recipient ids — CEO D7).
create or replace function public.squad_my_posts()
returns table (
  post_id uuid, category text, content text, location text, status text,
  current_people int, max_people int, created_at timestamptz, reach_count bigint
)
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  return query
  select ps.id, ps.category, ps.content, ps.location, ps.status,
         ps.current_people, ps.max_people, ps.created_at,
         (select count(*) from squad_pings sp where sp.post_id = ps.id)
  from squad_posts_with_status ps
  where ps.created_by_student_id = v_student
  order by ps.created_at desc;
end;
$$;

-- 3) Joined: posts I'm a member of (student-keyed george joins OR user_id web joins).
create or replace function public.squad_my_joined()
returns table (
  post_id uuid, category text, content text, location text, status text,
  current_people int, max_people int, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  return query
  select ps.id, ps.category, ps.content, ps.location, ps.status,
         ps.current_people, ps.max_people, ps.created_at
  from squad_members sm
  join squad_posts_with_status ps on ps.id = sm.post_id
  where sm.student_id = v_student or sm.user_id = auth.uid()
  order by ps.created_at desc;
end;
$$;

-- 4) Receiving prefs (auto-create defaults: pings_enabled=false per CEO D5).
create or replace function public.squad_my_prefs()
returns public.user_match_prefs
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
  v_row public.user_match_prefs;
begin
  select * into v_row from user_match_prefs where student_id = v_student;
  if not found then
    insert into user_match_prefs (student_id) values (v_student)
    on conflict (student_id) do nothing;
    select * into v_row from user_match_prefs where student_id = v_student;
  end if;
  return v_row;
end;
$$;

-- 5) 匹配依据: whitelisted signals only (interest_tags + facet labels). No memory blocks.
create or replace function public.squad_my_signals()
returns table (interest_tags text[], facets json)
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  return query
  select coalesce(st.interest_tags, '{}'),
         coalesce((select json_agg(json_build_object(
                     'label', uiv.label, 'source', uiv.source, 'updated_at', uiv.updated_at)
                     order by uiv.updated_at desc)
                   from user_interest_vectors uiv where uiv.student_id = v_student), '[]'::json)
  from students st where st.id = v_student;
end;
$$;

revoke all on function public.squad_my_pings() from public, anon;
revoke all on function public.squad_my_posts() from public, anon;
revoke all on function public.squad_my_joined() from public, anon;
revoke all on function public.squad_my_prefs() from public, anon;
revoke all on function public.squad_my_signals() from public, anon;
grant execute on function public.squad_my_pings() to authenticated, service_role;
grant execute on function public.squad_my_posts() to authenticated, service_role;
grant execute on function public.squad_my_joined() to authenticated, service_role;
grant execute on function public.squad_my_prefs() to authenticated, service_role;
grant execute on function public.squad_my_signals() to authenticated, service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260615120000_squad_phase3_rpcs.sql
git commit -m "feat(squad-p3): read RPCs — pings inbox, posts reach, joined, prefs, signals"
```

### Task A3: Write RPCs — respond, set_prefs, add/remove interest

**Files:**
- Modify: `supabase/migrations/20260615120000_squad_phase3_rpcs.sql`

- [ ] **Step 1: Append the four write RPCs**

```sql
-- 6) Respond to MY ping only; a single response is final.
create or replace function public.squad_respond_to_ping(p_ping_id uuid, p_response text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
  v_owner uuid; v_existing text;
begin
  if p_response not in ('joined','declined') then
    raise exception 'invalid_response' using errcode = '22023';
  end if;
  select recipient_student_id, response into v_owner, v_existing
    from squad_pings where id = p_ping_id;
  if v_owner is null then raise exception 'ping_not_found' using errcode = 'P0002'; end if;
  if v_owner <> v_student then raise exception 'not_your_ping' using errcode = '42501'; end if;
  if v_existing is not null then raise exception 'already_responded' using errcode = 'P0001'; end if;
  update squad_pings set response = p_response, responded_at = now() where id = p_ping_id;
end;
$$;

-- 7) Upsert my receiving prefs (re-validate the CHECK ranges defensively).
create or replace function public.squad_set_prefs(
  p_pings_enabled boolean, p_allowed_categories text[], p_weekly_cap int,
  p_quiet_start smallint, p_quiet_end smallint, p_channel text)
returns public.user_match_prefs
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
  v_row public.user_match_prefs;
begin
  if p_weekly_cap < 0 then raise exception 'invalid_cap' using errcode = '22023'; end if;
  if p_quiet_start < 0 or p_quiet_start > 23 or p_quiet_end < 0 or p_quiet_end > 23 then
    raise exception 'invalid_quiet_hours' using errcode = '22023'; end if;
  if p_channel not in ('imessage','web','email') then
    raise exception 'invalid_channel' using errcode = '22023'; end if;
  insert into user_match_prefs (student_id, pings_enabled, allowed_categories,
      weekly_ping_cap, quiet_start_hour, quiet_end_hour, channel, updated_at)
    values (v_student, p_pings_enabled, p_allowed_categories, p_weekly_cap,
      p_quiet_start, p_quiet_end, p_channel, now())
    on conflict (student_id) do update set
      pings_enabled = excluded.pings_enabled,
      allowed_categories = excluded.allowed_categories,
      weekly_ping_cap = excluded.weekly_ping_cap,
      quiet_start_hour = excluded.quiet_start_hour,
      quiet_end_hour = excluded.quiet_end_hour,
      channel = excluded.channel,
      updated_at = now()
    returning * into v_row;
  return v_row;
end;
$$;

-- 8a) Remove an interest signal (cheap; no embedding).
create or replace function public.squad_remove_interest(p_tag text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  update students set interest_tags = array_remove(interest_tags, p_tag) where id = v_student;
  delete from user_interest_vectors where student_id = v_student and label = p_tag;
end;
$$;

-- 8b) Add an interest signal. Tag is ALWAYS added (tag-overlap leg). The facet vector
-- is best-effort: only written when the caller supplies one (embed never blocks).
create or replace function public.squad_add_interest(p_tag text, p_vector float8[] default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_student uuid := squad_resolve_me();
begin
  update students set interest_tags =
    (select array(select distinct unnest(coalesce(interest_tags,'{}') || array[p_tag])))
    where id = v_student;
  if p_vector is not null and array_length(p_vector, 1) = 1536 then
    insert into user_interest_vectors (student_id, label, vector, source, updated_at)
    values (v_student, p_tag, ('[' || array_to_string(p_vector, ',') || ']')::vector, 'web', now())
    on conflict (student_id, label) do update set vector = excluded.vector, updated_at = now();
  end if;
end;
$$;

revoke all on function public.squad_respond_to_ping(uuid, text) from public, anon;
revoke all on function public.squad_set_prefs(boolean, text[], int, smallint, smallint, text) from public, anon;
revoke all on function public.squad_remove_interest(text) from public, anon;
revoke all on function public.squad_add_interest(text, float8[]) from public, anon;
grant execute on function public.squad_respond_to_ping(uuid, text) to authenticated, service_role;
grant execute on function public.squad_set_prefs(boolean, text[], int, smallint, smallint, text) to authenticated, service_role;
grant execute on function public.squad_remove_interest(text) to authenticated, service_role;
grant execute on function public.squad_add_interest(text, float8[]) to authenticated, service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260615120000_squad_phase3_rpcs.sql
git commit -m "feat(squad-p3): write RPCs — respond, set_prefs, add/remove interest"
```

### Task A4: Integration tests (authed-client harness + invariants)

**Files:**
- Create: `lib/matching/__tests__/rpc.phase3.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

These RPCs derive identity from `auth.uid()`, so they must be exercised through a **real authenticated session**, not the service-role client. The harness creates throwaway auth users and signs them in.

```ts
// lib/matching/__tests__/rpc.phase3.integration.test.ts
// Run: RUN_DB_TESTS=true pnpm exec vitest run lib/matching/__tests__/rpc.phase3.integration.test.ts
// Needs .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { randomUUID } from "node:crypto";

const RUN = process.env.RUN_DB_TESTS === "true";
const d = describe.skipIf(!RUN);

function env(k: string): string {
  if (process.env[k]) return process.env[k]!;
  for (const p of [".env.local", "bia-admin/.env.local"]) {
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, "utf8").split("\n").find((l) => l.startsWith(k + "="));
    if (line) return line.slice(k.length + 1).trim();
  }
  throw new Error(`missing env ${k}`);
}

let admin: SupabaseClient;
const ids = { users: [] as string[], posts: [] as string[] };

// Create an auth user, sign in, return a JWT-bearing client + the resolved student id.
async function authed(): Promise<{ client: SupabaseClient; userId: string; studentId: string }> {
  const email = `itest-p3-${randomUUID()}@example.com`;
  const password = "test-pw-123456";
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const userId = created.user!.id;
  ids.users.push(userId);
  const client = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  // First self-scoped call JIT-provisions the students row.
  const { error: prefErr } = await client.rpc("squad_my_prefs");
  if (prefErr) throw prefErr;
  const { data: s } = await admin.from("students").select("id").eq("user_id", userId).single();
  return { client, userId, studentId: s!.id as string };
}

async function mkPost(studentId: string): Promise<string> {
  const { data, error } = await admin.from("squad_posts").insert({
    poster_name: "itest", category: "其它", content: "p3 itest post", contact: "x",
    max_people: 4, current_people: 1, tags: ["kbbq"], created_by_student_id: studentId, created_via: "web",
  }).select().single();
  if (error) throw error;
  ids.posts.push(data.id);
  return data.id as string;
}

async function mkPing(postId: string, recipient: string): Promise<string> {
  const { data, error } = await admin.from("squad_pings").insert({
    post_id: postId, recipient_student_id: recipient, score: 0.5, status: "sent",
    sent_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data.id as string;
}

beforeAll(() => {
  admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
});

afterAll(async () => {
  if (!RUN) return;
  if (ids.posts.length) await admin.from("squad_posts").delete().in("id", ids.posts);
  for (const u of ids.users) {
    const { data: s } = await admin.from("students").select("id").eq("user_id", u).maybeSingle();
    if (s) {
      await admin.from("user_match_prefs").delete().eq("student_id", s.id);
      await admin.from("user_interest_vectors").delete().eq("student_id", s.id);
      await admin.from("students").delete().eq("id", s.id);
    }
    await admin.auth.admin.deleteUser(u);
  }
});

d("squad phase 3 RPCs", () => {
  it("INVARIANT self-scope: squad_my_pings returns only the caller's pings", async () => {
    const a = await authed();
    const b = await authed();
    const post = await mkPost(b.studentId);
    await mkPing(post, a.studentId); // ping belongs to A

    const { data: aPings } = await a.client.rpc("squad_my_pings");
    const { data: bPings } = await b.client.rpc("squad_my_pings");
    expect((aPings ?? []).map((r: { post_id: string }) => r.post_id)).toContain(post);
    expect((bPings ?? []).length).toBe(0);
  });

  it("INVARIANT respond: only my ping, and a single response is final", async () => {
    const a = await authed();
    const b = await authed();
    const post = await mkPost(b.studentId);
    const ping = await mkPing(post, a.studentId);

    // B cannot respond to A's ping
    const bResp = await b.client.rpc("squad_respond_to_ping", { p_ping_id: ping, p_response: "joined" });
    expect(bResp.error).not.toBeNull();
    // A responds once — ok
    const a1 = await a.client.rpc("squad_respond_to_ping", { p_ping_id: ping, p_response: "joined" });
    expect(a1.error).toBeNull();
    // A responds again — rejected (final)
    const a2 = await a.client.rpc("squad_respond_to_ping", { p_ping_id: ping, p_response: "declined" });
    expect(a2.error).not.toBeNull();
  });

  it("INVARIANT aggregate-only: squad_my_posts returns reach_count, never recipient ids", async () => {
    const a = await authed();
    const b = await authed();
    const post = await mkPost(a.studentId);
    await mkPing(post, b.studentId);
    const { data } = await a.client.rpc("squad_my_posts");
    const row = (data ?? []).find((r: { post_id: string }) => r.post_id === post);
    expect(Number(row.reach_count)).toBe(1);
    expect(Object.keys(row)).not.toContain("recipient_student_id");
  });

  it("INVARIANT default-off: squad_my_prefs auto-creates with pings_enabled=false", async () => {
    const a = await authed();
    const { data } = await a.client.rpc("squad_my_prefs");
    expect(data.pings_enabled).toBe(false);
  });

  it("set_prefs rejects out-of-range quiet hours", async () => {
    const a = await authed();
    const { error } = await a.client.rpc("squad_set_prefs", {
      p_pings_enabled: true, p_allowed_categories: null, p_weekly_cap: 3,
      p_quiet_start: 30, p_quiet_end: 9, p_channel: "imessage",
    });
    expect(error).not.toBeNull();
  });

  it("add/remove interest mutates only the caller's signals", async () => {
    const a = await authed();
    await a.client.rpc("squad_add_interest", { p_tag: "kbbq", p_vector: null });
    const { data: sig } = await a.client.rpc("squad_my_signals");
    expect(sig[0].interest_tags).toContain("kbbq");
    await a.client.rpc("squad_remove_interest", { p_tag: "kbbq" });
    const { data: sig2 } = await a.client.rpc("squad_my_signals");
    expect(sig2[0].interest_tags).not.toContain("kbbq");
  });

  it("INVARIANT anon: anonymous callers cannot execute the self-scoped RPCs", async () => {
    const anon = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
    const { error } = await anon.rpc("squad_my_pings");
    expect(error).not.toBeNull(); // not_authenticated (28000) or permission denied
  });
});
```

- [ ] **Step 2: Apply the migration to the dev/prod project, then run the tests**

Apply via the Supabase MCP `apply_migration` (project `ujkaregrwrppaehvbahf`), passing the file contents. Then:

```bash
cd ~/"Documents/BIA 新生service/bia-admin"
RUN_DB_TESTS=true pnpm exec vitest run lib/matching/__tests__/rpc.phase3.integration.test.ts
```
Expected: all 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/matching/__tests__/rpc.phase3.integration.test.ts
git commit -m "test(squad-p3): integration tests — self-scope, respond finality, aggregate-only, default-off"
```

- [ ] **Step 4: Open the bia-admin PR**

```bash
git push -u origin feat/squad-phase3-rpcs
gh pr create --title "feat(squad-p3): web activity hub RPCs (8 self-scoped functions)" \
  --body-file <(printf '%s\n' "Phase 3 of squad-reimagined. 8 self-scoped SECURITY DEFINER RPCs via squad_resolve_me(): pings inbox, organizer aggregate reach, joined, prefs, signals, respond, set_prefs, add/remove interest. Migration applied to prod ujkaregrwrppaehvbahf. Tests: self-scope, respond finality, aggregate-only, default-off, anon-denied." "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```

---

# PART B — bia-roommate (PR 2)

> All work in `~/Code/bia-roommate` on branch `feat/squad-phase3-activity` (already created). **Part A's migration must be applied to prod before these routes work end-to-end.** Reproduce the Vercel build typecheck locally with `env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build` when touching route files (route files export ONLY HTTP handlers + config).

### Task B1: Shared types + the two lib helpers (with tests)

**Files:**
- Create: `lib/squad/me-types.ts`, `lib/squad/ping-reason.ts`, `lib/squad/george-link.ts`
- Test: `lib/squad/__tests__/ping-reason.test.ts`, `lib/squad/__tests__/george-link.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/squad/__tests__/ping-reason.test.ts
import { describe, it, expect } from "vitest";
import { buildPingReason } from "../ping-reason";

describe("buildPingReason", () => {
  it("uses the first matched tag, underscores prettified", () => {
    expect(buildPingReason(["korean_food", "kbbq"], null)).toBe("✦ 你提到 korean food");
  });
  it("falls back to best_facet when no tags", () => {
    expect(buildPingReason([], "bouldering")).toBe("✦ 你提到 bouldering");
  });
  it("returns null when there is no real signal", () => {
    expect(buildPingReason([], null)).toBeNull();
  });
});
```

```ts
// lib/squad/__tests__/george-link.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { buildGeorgeImessageLink } from "../george-link";

afterEach(() => { delete process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE; });

describe("buildGeorgeImessageLink", () => {
  it("builds a prefilled sms deep-link when the phone is configured", () => {
    process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE = "+13105551234";
    const link = buildGeorgeImessageLink("拼车局 K-town");
    expect(link).toContain("sms:+13105551234");
    expect(link).toContain(encodeURIComponent("我想加入 拼车局 K-town"));
  });
  it("returns null when the phone is unset (UI falls back to plain text)", () => {
    expect(buildGeorgeImessageLink("x")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run lib/squad/__tests__/ping-reason.test.ts lib/squad/__tests__/george-link.test.ts`
Expected: FAIL ("Cannot find module ../ping-reason").

- [ ] **Step 3: Implement**

```ts
// lib/squad/me-types.ts
// Shared shapes for the /squad 我的 hub + account settings. Mirror the bia-admin
// Phase 3 RPC return columns (migration 20260615120000).
export interface PingRow {
  ping_id: string; post_id: string; category: string; content: string;
  location: string | null; poster_name: string; current_people: number;
  max_people: number; status: string; score: number;
  response: "joined" | "declined" | null; responded_at: string | null;
  created_at: string; matched_tags: string[]; best_facet: string | null;
}
export interface MyPostRow {
  post_id: string; category: string; content: string; location: string | null;
  status: string; current_people: number; max_people: number;
  created_at: string; reach_count: number;
}
export interface MyJoinedRow {
  post_id: string; category: string; content: string; location: string | null;
  status: string; current_people: number; max_people: number; created_at: string;
}
export interface MatchPrefs {
  student_id: string; pings_enabled: boolean; allowed_categories: string[] | null;
  weekly_ping_cap: number; quiet_start_hour: number; quiet_end_hour: number;
  channel: string; updated_at: string;
}
export interface SignalFacet { label: string; source: string; updated_at: string; }
export interface MySignals { interest_tags: string[]; facets: SignalFacet[]; }
```

```ts
// lib/squad/ping-reason.ts
// The ✦ reason on a ping card — george's "你之前提到 X" framing. Backed by real
// data (matched tag, else best facet); null renders no chip (no fake reasons).
export function buildPingReason(matchedTags: string[], bestFacet: string | null): string | null {
  const tag = matchedTags?.[0] ?? bestFacet;
  return tag ? `✦ 你提到 ${tag.replace(/_/g, " ")}` : null;
}
```

```ts
// lib/squad/george-link.ts
// The 加入 handoff: web records interest, then points the user to finish the join
// with george over iMessage. Prefilled sms deep-link (iOS '?&body='); null when the
// pool number isn't configured so the UI can fall back to a plain instruction.
export function buildGeorgeImessageLink(postLabel: string): string | null {
  const phone = process.env.NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE;
  if (!phone) return null;
  return `sms:${phone}?&body=${encodeURIComponent(`我想加入 ${postLabel}`)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run lib/squad/__tests__/ping-reason.test.ts lib/squad/__tests__/george-link.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/squad/me-types.ts lib/squad/ping-reason.ts lib/squad/george-link.ts lib/squad/__tests__/
git commit -m "feat(squad-p3): shared me-types + ping-reason + george-link helpers"
```

### Task B2: Activity API routes (pings, posts, joined, respond)

**Files:**
- Create: `app/api/squad/me/pings/route.ts`, `app/api/squad/me/posts/route.ts`, `app/api/squad/me/joined/route.ts`, `app/api/squad/me/pings/[id]/respond/route.ts`
- Create (sibling helper for testable mapping): `app/api/squad/me/pings/[id]/respond/parse.ts`
- Test: `app/api/squad/me/pings/[id]/respond/parse.test.ts`

- [ ] **Step 1: Write the four read/respond routes**

Each mirrors `app/api/squad/foryou/route.ts`: the user's own session client calls the self-scoped RPC (RLS allows `authenticated` execute; `auth.uid()` flows from the JWT).

```ts
// app/api/squad/me/pings/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_pings");
    if (error) return NextResponse.json({ error: "pings_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
```

```ts
// app/api/squad/me/posts/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_posts");
    if (error) return NextResponse.json({ error: "posts_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
```

```ts
// app/api/squad/me/joined/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_joined");
    if (error) return NextResponse.json({ error: "joined_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
```

```ts
// app/api/squad/me/pings/[id]/respond/parse.ts
// Helper kept OUT of route.ts (Next 16 forbids non-handler exports from route files).
export function respondStatusForError(message: string): number {
  if (message.includes("already_responded")) return 409;
  if (message.includes("not_your_ping")) return 403;
  if (message.includes("ping_not_found")) return 404;
  return 400;
}
```

```ts
// app/api/squad/me/pings/[id]/respond/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";
import { respondStatusForError } from "./parse";

const schema = z.object({ response: z.enum(["joined", "declined"]) });

export const POST = authedHandler<typeof schema, { id: string }>({
  schema,
  handler: async ({ supabase, params, body }) => {
    const { error } = await supabase.rpc("squad_respond_to_ping", {
      p_ping_id: params.id, p_response: body.response,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: respondStatusForError(error.message) });
    return NextResponse.json({ ok: true });
  },
});
```

- [ ] **Step 2: Write + run the parse helper test**

```ts
// app/api/squad/me/pings/[id]/respond/parse.test.ts
import { describe, it, expect } from "vitest";
import { respondStatusForError } from "./parse";

describe("respondStatusForError", () => {
  it("maps RPC raises to HTTP codes", () => {
    expect(respondStatusForError("already_responded")).toBe(409);
    expect(respondStatusForError("not_your_ping")).toBe(403);
    expect(respondStatusForError("ping_not_found")).toBe(404);
    expect(respondStatusForError("invalid_response")).toBe(400);
  });
});
```

Run: `pnpm exec vitest run "app/api/squad/me/pings/[id]/respond/parse.test.ts"`
Expected: PASS.

- [ ] **Step 3: Verify the production build typecheck accepts the route files**

Run: `env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build`
Expected: build completes (no "invalid export" errors from the new route files). If the full build is too slow locally, at minimum run `pnpm exec tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add app/api/squad/me/
git commit -m "feat(squad-p3): activity API routes — pings, posts, joined, respond"
```

### Task B3: PingInbox + MyActivity components

**Files:**
- Create: `components/squad/PingInbox.tsx`, `components/squad/MyActivity.tsx`
- Test: `components/squad/__tests__/PingInbox.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// components/squad/__tests__/PingInbox.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import PingInbox from "../PingInbox";
import type { PingRow } from "@/lib/squad/me-types";

afterEach(cleanup);

const ping = (over: Partial<PingRow> = {}): PingRow => ({
  ping_id: "p1", post_id: "po1", category: "拼车", content: "K-town 拼车 3缺2",
  location: "K-town", poster_name: "学长", current_people: 1, max_people: 3,
  status: "open", score: 0.5, response: null, responded_at: null,
  created_at: new Date().toISOString(), matched_tags: ["korean_food"], best_facet: null, ...over,
});

describe("PingInbox", () => {
  it("renders the ✦ reason chip and the 加入/忽略 actions", () => {
    render(<PingInbox pings={[ping()]} onResponded={vi.fn()} />);
    expect(screen.getByText(/你提到 korean food/)).toBeTruthy();
    expect(screen.getByText("加入")).toBeTruthy();
    expect(screen.getByText("忽略")).toBeTruthy();
  });

  it("POSTs the response and shows the george handoff after 加入", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PingInbox pings={[ping()]} onResponded={vi.fn()} />);
    fireEvent.click(screen.getByText("加入"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/squad/me/pings/p1/respond",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText(/george/i)).toBeTruthy(); // handoff affordance
    });
    vi.unstubAllGlobals();
  });

  it("disables 加入 on a full post but still allows 忽略", () => {
    render(<PingInbox pings={[ping({ status: "full" })]} onResponded={vi.fn()} />);
    expect((screen.getByText("加入") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("忽略") as HTMLButtonElement).disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run components/squad/__tests__/PingInbox.test.tsx`
Expected: FAIL ("Cannot find module ../PingInbox").

- [ ] **Step 3: Implement PingInbox**

```tsx
// components/squad/PingInbox.tsx
"use client";
import { useState } from "react";
import ReasonChip from "./ReasonChip";
import { CATEGORY_COLORS } from "./SquadCard";
import { buildPingReason } from "@/lib/squad/ping-reason";
import { buildGeorgeImessageLink } from "@/lib/squad/george-link";
import type { PingRow } from "@/lib/squad/me-types";

export default function PingInbox({
  pings, onResponded,
}: { pings: PingRow[]; onResponded: (pingId: string, response: "joined" | "declined") => void }) {
  if (pings.length === 0) {
    return <p className="text-sm" style={{ color: "var(--mid)" }}>还没有人 ping 你 — 把 pings 打开就有机会被组局的人找到。</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {pings.map((p) => <PingCard key={p.ping_id} ping={p} onResponded={onResponded} />)}
    </div>
  );
}

function PingCard({ ping, onResponded }: { ping: PingRow; onResponded: (id: string, r: "joined" | "declined") => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"joined" | "declined" | null>(ping.response);
  const color = CATEGORY_COLORS[ping.category] ?? "#1a1410";
  const joinable = ping.status === "open";
  const reason = buildPingReason(ping.matched_tags, ping.best_facet);
  const label = `${ping.category}局${ping.location ? " " + ping.location : ""}`;
  const georgeLink = buildGeorgeImessageLink(label);

  async function respond(r: "joined" | "declined") {
    setBusy(true);
    try {
      const res = await fetch(`/api/squad/me/pings/${ping.ping_id}/respond`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: r }),
      });
      if (res.ok) { setDone(r); onResponded(ping.ping_id, r); }
    } finally { setBusy(false); }
  }

  return (
    <div className="brutal-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="brutal-tag font-display text-[11px]" style={{ background: color, color: "white", borderColor: color }}>{ping.category}</span>
        <span className="font-display text-sm" style={{ color: ping.status === "full" ? "var(--cardinal)" : "var(--black)" }}>
          {ping.current_people}/{ping.max_people} 人{ping.status === "full" ? " · 已满" : ""}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--black)" }}>{ping.content}</p>
      <ReasonChip reason={reason} />
      {done === "joined" ? (
        <div className="pt-3 border-t-[2px] border-[var(--black)] text-xs" style={{ color: "var(--black)" }}>
          已记下你的兴趣 ✓ —{" "}
          {georgeLink ? (
            <a href={georgeLink} className="font-display" style={{ color: "var(--cardinal)" }}>去 iMessage 找 george 报名 →</a>
          ) : (<span>iMessage george 帮你报名</span>)}
        </div>
      ) : done === "declined" ? (
        <p className="pt-3 border-t-[2px] border-[var(--black)] text-xs" style={{ color: "var(--mid)" }}>已忽略</p>
      ) : (
        <div className="pt-3 border-t-[2px] border-[var(--black)] flex gap-3">
          <button disabled={busy || !joinable} onClick={() => respond("joined")} className="brutal-btn brutal-btn-primary disabled:opacity-40">加入</button>
          <button disabled={busy} onClick={() => respond("declined")} className="brutal-btn disabled:opacity-40">忽略</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement MyActivity (fetches all three streams on mount)**

```tsx
// components/squad/MyActivity.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import PingInbox from "./PingInbox";
import type { PingRow, MyPostRow, MyJoinedRow } from "@/lib/squad/me-types";

export default function MyActivity() {
  const [pings, setPings] = useState<PingRow[]>([]);
  const [posts, setPosts] = useState<MyPostRow[]>([]);
  const [joined, setJoined] = useState<MyJoinedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, mp, mj] = await Promise.all([
      fetch("/api/squad/me/pings").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/squad/me/posts").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/squad/me/joined").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setPings(p); setPosts(mp); setJoined(mj); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const onResponded = (pingId: string, response: "joined" | "declined") =>
    setPings((prev) => prev.map((p) => (p.ping_id === pingId ? { ...p, response } : p)));

  if (loading) return <p className="text-sm" style={{ color: "var(--mid)" }}>加载中…</p>;

  return (
    <div className="flex flex-col gap-12">
      <Stream title="PINGS 收件箱" count={pings.filter((p) => p.response === null).length}>
        <PingInbox pings={pings} onResponded={onResponded} />
      </Stream>
      <Stream title="我的局">
        {posts.length === 0 ? <Empty text="你还没组过局。" /> : (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <li key={p.post_id} className="brutal-card p-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--black)" }}>{p.category} · {p.content.slice(0, 24)} · {p.status}</span>
                <span className="font-display text-xs" style={{ color: "var(--mid)" }}>已 ping {p.reach_count} 人</span>
              </li>
            ))}
          </ul>
        )}
      </Stream>
      <Stream title="已加入">
        {joined.length === 0 ? <Empty text="还没加入任何局。" /> : (
          <ul className="flex flex-col gap-3">
            {joined.map((p) => (
              <li key={p.post_id} className="brutal-card p-4 text-xs" style={{ color: "var(--black)" }}>{p.category} · {p.content.slice(0, 30)} · {p.status}</li>
            ))}
          </ul>
        )}
      </Stream>
    </div>
  );
}

function Stream({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-lg mb-4 flex items-center gap-2" style={{ color: "var(--black)" }}>
        {title}{count ? <span className="brutal-tag brutal-tag-filled">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm" style={{ color: "var(--mid)" }}>{text}</p>;
}
```

- [ ] **Step 5: Run the component test to verify it passes**

Run: `pnpm exec vitest run components/squad/__tests__/PingInbox.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add components/squad/PingInbox.tsx components/squad/MyActivity.tsx components/squad/__tests__/PingInbox.test.tsx
git commit -m "feat(squad-p3): PingInbox + MyActivity (inbox + 我的局 + 已加入)"
```

### Task B4: Wire the `我的` view toggle into `/squad`

**Files:**
- Modify: `app/squad/page.tsx`

- [ ] **Step 1: Add the import and a top-level view state**

After the existing imports (line 12, after the `ForYouSection` import) add:

```tsx
import MyActivity from "@/components/squad/MyActivity";
```

Inside `SquadContent()`, after the `const [selected, setSelected] = useState<SquadPost | null>(null);` line (line 50), add:

```tsx
  const [view, setView] = useState<"discover" | "mine">("discover");
```

- [ ] **Step 2: Add the toggle UI + conditional render**

Replace the opening of the returned tree — the line `return (` … `<div className="min-h-screen">` (lines 129-130) and immediately insert the toggle right after the `<div className="min-h-screen">` opening (before `{showToast && (`):

```tsx
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-6 flex gap-0">
        {(["discover", "mine"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="font-display text-sm tracking-[0.08em] px-5 py-3 border-[3px] border-[var(--black)] -mr-[3px] transition-colors"
            style={{ background: view === v ? "var(--black)" : "var(--cream)", color: view === v ? "white" : "var(--mid)" }}
          >
            {v === "discover" ? "发现" : "我的"}
          </button>
        ))}
      </div>
      {view === "mine" ? (
        <section className="max-w-6xl mx-auto px-6 py-10"><MyActivity /></section>
      ) : (
      <>
```

Then, at the very end of the existing discover content — just before the final `</div>` that closes `<div className="min-h-screen">` (the `</div>` on line 382, after the `{selected && (<SquadModal .../>)}` block) — close the fragment:

```tsx
      </>
      )}
    </div>
  );
```

> The `selected`/`SquadModal` block stays inside the `discover` branch (it's part of browse). The `我的` branch renders only `<MyActivity />`.

- [ ] **Step 3: Verify build/typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. Optionally run the dev server and click 发现/我的 to confirm the toggle.

- [ ] **Step 4: Commit**

```bash
git add app/squad/page.tsx
git commit -m "feat(squad-p3): 发现/我的 view toggle on /squad"
```

### Task B5: Settings API routes (prefs + signals)

**Files:**
- Create: `app/api/squad/prefs/route.ts`, `app/api/squad/signals/route.ts`

> These live under `app/api/squad/` (not `app/account/george/api/`) so the client URLs are `/api/squad/prefs` and `/api/squad/signals` — the paths the settings component calls in Task B6.

- [ ] **Step 1: Write the prefs route (GET + PUT)**

```ts
// app/api/squad/prefs/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_prefs");
    if (error) return NextResponse.json({ error: "prefs_unavailable" }, { status: 502 });
    return NextResponse.json(data);
  },
});

const putSchema = z.object({
  pings_enabled: z.boolean(),
  allowed_categories: z.array(z.string()).nullable(),
  weekly_ping_cap: z.number().int().min(0).max(50),
  quiet_start_hour: z.number().int().min(0).max(23),
  quiet_end_hour: z.number().int().min(0).max(23),
  channel: z.enum(["imessage", "web", "email"]),
});

export const PUT = authedHandler({
  schema: putSchema,
  handler: async ({ supabase, body }) => {
    const { data, error } = await supabase.rpc("squad_set_prefs", {
      p_pings_enabled: body.pings_enabled,
      p_allowed_categories: body.allowed_categories,
      p_weekly_cap: body.weekly_ping_cap,
      p_quiet_start: body.quiet_start_hour,
      p_quiet_end: body.quiet_end_hour,
      p_channel: body.channel,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
});
```

- [ ] **Step 2: Write the signals route (GET + POST add + DELETE remove)**

The POST embeds best-effort via the `embed` Edge Function, then writes; a non-200 embed still adds the tag (`p_vector: null`).

```ts
// app/api/squad/signals/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_signals");
    if (error) return NextResponse.json({ error: "signals_unavailable" }, { status: 502 });
    return NextResponse.json((data ?? [])[0] ?? { interest_tags: [], facets: [] });
  },
});

const tagSchema = z.object({ tag: z.string().trim().min(1).max(40) });

export const POST = authedHandler({
  schema: tagSchema,
  handler: async ({ supabase, body }) => {
    let vector: number[] | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("embed", { body: { texts: [body.tag] } });
      if (!error && Array.isArray(data?.embeddings?.[0])) vector = data.embeddings[0] as number[];
    } catch { /* embed unavailable — tag is still added (tag-overlap leg), facet skipped */ }
    const { error } = await supabase.rpc("squad_add_interest", { p_tag: body.tag, p_vector: vector });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, embedded: vector !== null });
  },
});

export const DELETE = authedHandler({
  schema: tagSchema,
  handler: async ({ supabase, body }) => {
    const { error } = await supabase.rpc("squad_remove_interest", { p_tag: body.tag });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
});
```

- [ ] **Step 3: Verify the production build typecheck**

Run: `env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build` (or at minimum `pnpm exec tsc --noEmit`).
Expected: the new route files export only HTTP handlers — build passes.

- [ ] **Step 4: Commit**

```bash
git add app/api/squad/prefs/ app/api/squad/signals/
git commit -m "feat(squad-p3): settings API — prefs + signals (embed-on-add)"
```

### Task B6: SquadSettingsSection (匹配依据 + 接收控制) + wire into /account/george

**Files:**
- Create: `app/account/george/_components/SquadSettingsSection.tsx`
- Modify: `app/account/george/page.tsx`
- Test: `app/account/george/_components/__tests__/SquadSettingsSection.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// app/account/george/_components/__tests__/SquadSettingsSection.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SquadSettingsSection from "../SquadSettingsSection";
import type { MatchPrefs, MySignals } from "@/lib/squad/me-types";

afterEach(cleanup);

const prefs: MatchPrefs = {
  student_id: "s1", pings_enabled: false, allowed_categories: null, weekly_ping_cap: 3,
  quiet_start_hour: 23, quiet_end_hour: 9, channel: "imessage", updated_at: "",
};
const signals: MySignals = { interest_tags: ["korean_food"], facets: [{ label: "korean_food", source: "profile", updated_at: "" }] };

describe("SquadSettingsSection", () => {
  it("renders the pings toggle OFF by default and the existing interest tag", () => {
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    expect((screen.getByLabelText(/接收 pings/i) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/korean food/)).toBeTruthy();
  });

  it("PUTs prefs when the toggle flips on", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ...prefs, pings_enabled: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    fireEvent.click(screen.getByLabelText(/接收 pings/i));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/squad/prefs", expect.objectContaining({ method: "PUT" })));
    vi.unstubAllGlobals();
  });

  it("POSTs a new interest tag on add", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, embedded: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SquadSettingsSection initialPrefs={prefs} initialSignals={signals} />);
    fireEvent.change(screen.getByPlaceholderText(/加兴趣/), { target: { value: "bouldering" } });
    fireEvent.click(screen.getByText("添加"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/squad/signals", expect.objectContaining({ method: "POST" })));
    vi.unstubAllGlobals();
  });
});
```

> The settings component calls `/api/squad/prefs` and `/api/squad/signals` — the routes created in Task B5 at `app/api/squad/{prefs,signals}/route.ts`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run app/account/george/_components/__tests__/SquadSettingsSection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement SquadSettingsSection**

```tsx
// app/account/george/_components/SquadSettingsSection.tsx
"use client";
import { useState } from "react";
import type { MatchPrefs, MySignals } from "@/lib/squad/me-types";

const CATS = ["拼车", "自习", "约会", "健身", "游戏", "其它"];

export default function SquadSettingsSection({
  initialPrefs, initialSignals,
}: { initialPrefs: MatchPrefs; initialSignals: MySignals }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [tags, setTags] = useState(initialSignals.interest_tags);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePrefs(next: MatchPrefs) {
    setPrefs(next); setSaving(true);
    try {
      await fetch("/api/squad/prefs", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pings_enabled: next.pings_enabled, allowed_categories: next.allowed_categories,
          weekly_ping_cap: next.weekly_ping_cap, quiet_start_hour: next.quiet_start_hour,
          quiet_end_hour: next.quiet_end_hour, channel: next.channel,
        }),
      });
    } finally { setSaving(false); }
  }

  async function addTag() {
    const tag = draft.trim();
    if (!tag || tags.includes(tag)) { setDraft(""); return; }
    setTags((t) => [...t, tag]); setDraft("");
    await fetch("/api/squad/signals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tag }) });
  }
  async function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
    await fetch("/api/squad/signals", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ tag }) });
  }

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl" style={{ color: "var(--black)" }}>squad 接收设置</h2>

      {/* 匹配依据 */}
      <div className="brutal-card p-5 space-y-3">
        <p className="font-display text-sm" style={{ color: "var(--black)" }}>匹配依据 — george 用这些给你匹配局</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="brutal-tag flex items-center gap-1">
              {t.replace(/_/g, " ")}
              <button aria-label={`remove ${t}`} onClick={() => removeTag(t)} style={{ color: "var(--cardinal)" }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="加兴趣，比如 韩餐 / bouldering" className="brutal-input flex-1" />
          <button onClick={addTag} className="brutal-btn brutal-btn-gold">添加</button>
        </div>
      </div>

      {/* 接收控制 */}
      <div className="brutal-card p-5 space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--black)" }}>接收 pings（默认关，开了才会被组局的人找到）</span>
          <input type="checkbox" aria-label="接收 pings" checked={prefs.pings_enabled}
            onChange={(e) => savePrefs({ ...prefs, pings_enabled: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--black)" }}>每周最多</span>
          <input type="number" min={0} max={50} value={prefs.weekly_ping_cap} className="brutal-input w-20"
            onChange={(e) => savePrefs({ ...prefs, weekly_ping_cap: Number(e.target.value) })} />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm" style={{ color: "var(--black)" }}>免打扰</span>
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={23} value={prefs.quiet_start_hour} className="brutal-input w-16"
              onChange={(e) => savePrefs({ ...prefs, quiet_start_hour: Number(e.target.value) })} />
            <span>–</span>
            <input type="number" min={0} max={23} value={prefs.quiet_end_hour} className="brutal-input w-16"
              onChange={(e) => savePrefs({ ...prefs, quiet_end_hour: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: "var(--black)" }}>范围（不选 = 全部）</p>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => {
              const on = prefs.allowed_categories?.includes(c) ?? false;
              return (
                <button key={c}
                  onClick={() => {
                    const cur = prefs.allowed_categories ?? [];
                    const next = on ? cur.filter((x) => x !== c) : [...cur, c];
                    savePrefs({ ...prefs, allowed_categories: next.length ? next : null });
                  }}
                  className="brutal-tag" style={{ background: on ? "var(--black)" : "transparent", color: on ? "white" : "var(--mid)" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {saving && <p className="text-[11px]" style={{ color: "var(--mid)" }}>保存中…</p>}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire it into the page**

In `app/account/george/page.tsx`, add the import (after line 5):

```tsx
import SquadSettingsSection from './_components/SquadSettingsSection';
```

Extend the `Promise.all` (lines 14-21) to also fetch prefs + signals via the RPCs, and render the section after `PrivacySection`:

```tsx
  const [{ data: profile }, { data: config }, prefsRes, signalsRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_heartbeat_config').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('squad_my_prefs'),
    supabase.rpc('squad_my_signals'),
  ]);
  const squadPrefs = prefsRes.data;
  const squadSignals = (signalsRes.data ?? [])[0] ?? { interest_tags: [], facets: [] };
```

Then in the JSX, after `<PrivacySection .../>` (line 41):

```tsx
      {squadPrefs && <SquadSettingsSection initialPrefs={squadPrefs} initialSignals={squadSignals} />}
```

- [ ] **Step 5: Run the component test + typecheck**

Run: `pnpm exec vitest run app/account/george/_components/__tests__/SquadSettingsSection.test.tsx`
Expected: PASS (3 tests).
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/account/george/_components/SquadSettingsSection.tsx app/account/george/page.tsx app/account/george/_components/__tests__/
git commit -m "feat(squad-p3): SquadSettingsSection (匹配依据 + 接收控制) on /account/george"
```

### Task B7: env var + full suite + PR

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Document the env var**

Append to `.env.example`:

```bash
# Public george iMessage pool number for the Squad 加入 handoff deep-link.
# Mirrors george's GEORGE_IMESSAGE_PHONE. If unset, the 加入 confirm shows a plain
# "iMessage george 报名" instruction without a prefilled message.
NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE=
```

Also set this value on the bia-roommate Vercel project (ops step, not code).

- [ ] **Step 2: Run the full bia-roommate test suite + production build**

```bash
pnpm exec vitest run
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build
```
Expected: all tests pass; build succeeds.

- [ ] **Step 3: Commit + open the PR**

```bash
git add .env.example
git commit -m "chore(squad-p3): document NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE"
git push -u origin feat/squad-phase3-activity
gh pr create --title "feat(squad-p3): web activity hub + receiving controls" \
  --body-file <(printf '%s\n' "Phase 3 of squad-reimagined. /squad gains a 我的 view (PINGS inbox + 我的局 aggregate reach + 已加入); /account/george gains Squad 接收设置 (匹配依据 add/remove + receiving controls). 加入 records interest + hands off to george via an iMessage deep-link (no squad_members write). Depends on bia-admin PR (squad phase 3 RPCs) being merged + applied to prod." "" "Companion: bia-admin feat/squad-phase3-rpcs." "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```

---

## Self-Review

**1. Spec coverage**
- Web ping inbox → Task B3 (PingInbox) + B2 (routes) + A2 (`squad_my_pings`). ✓
- 我的局 aggregate reach → A2 (`squad_my_posts` reach_count, no ids) + B3. ✓
- 已加入 → A2 (`squad_my_joined`) + B3. ✓
- 匹配依据 view/add/remove → A2 (`squad_my_signals`) + A3 (`squad_add_interest`/`squad_remove_interest`) + B5 (embed-on-add route) + B6 (MatchSignals UI). ✓
- Receiving controls → A2/A3 (`squad_my_prefs`/`squad_set_prefs`) + B5 + B6. ✓
- 加入 handoff (interest + deep-link, no squad_members write) → B1 (george-link) + B3 (PingCard). ✓
- Privacy: aggregate-only reach (A2), self-scoping + anon-denied (A4 tests), whitelisted signals (A2 `squad_my_signals`). ✓
- pings_enabled default OFF (A2 `squad_my_prefs` + A4 test); single-response-final (A3 + A4); embed never blocks (A3 + B5); derived status via `squad_posts_with_status` (A2/A3 joins). ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every command has an expected result. The one open assumption is called out explicitly: `squad_my_posts` matches `created_by_student_id` — during build, **verify the web `/squad/submit` flow sets `created_by_student_id`**; if web posts only carry the legacy owner column, add that column to the `squad_my_posts` WHERE clause (or backfill). This is a verification step, not a placeholder.

**3. Type consistency:** RPC return columns ↔ `lib/squad/me-types.ts` (`PingRow`, `MyPostRow`, `MyJoinedRow`, `MatchPrefs`, `MySignals`) ↔ component props all align. Route client paths are standardized to `/api/squad/me/*` (activity) and `/api/squad/{prefs,signals}` (settings) — see the Task B6 Step 1 note correcting the settings routes to `app/api/squad/{prefs,signals}/route.ts` so the client URLs match. RPC arg names (`p_ping_id`, `p_response`, `p_pings_enabled`, …) match between A2/A3 and the B2/B5 route calls.
