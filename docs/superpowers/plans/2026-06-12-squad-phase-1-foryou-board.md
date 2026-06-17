# Squad Phase 1 — "For You" Board + Cold-Start Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/squad` personalized — a 为你推荐 ranked section with numbered top-3 and ✦ reason chips for signed-in users — and wire the existing onboarding interest capture into the matching engine so personalization is real from a student's first visit.

**Architecture:** One bia-admin migration adds a self-scoped `squad_board_for_me()` security-definer RPC (derives `auth.uid()` → students.id with JIT provisioning; closes the probe-other-students hole in the raw RPC's `authenticated` grant) and extends the rank payload with `matched_tags`. bia-roommate adds `/api/squad/foryou` (authed), a reason-builder util, the 为你推荐 UI per the approved mockups (variant C structure + variant A's numbered ranks) with the §11.6 state table, mobile FAB + a11y, and profile-submit wiring (form categories → `interest_tags` + embedded facets via the `embed` Edge Function, tags-only on embed failure).

**Tech Stack:** Next.js 16 App Router, `authedHandler` + `createAdminSupabaseClient` (existing patterns), Supabase RPC, the deployed `embed` Edge Function, vitest + `vi.mock`, brutal design tokens from `globals.css`.

**Source spec:** `docs/superpowers/specs/2026-06-12-squad-reimagined-design.md` §5.1, §6, §10 Phase 1, §11.6 (state table, responsive, mockups). Phase 0 (PR bia-admin#16) is live: RPCs, `embed` fn, vectors backfilled.

**Repos/branches:** bia-roommate `feat/squad-foryou-board` off `main`; bia-admin migration on `feat/squad-phase1-rpc` off `main` (applied via Supabase MCP to `ujkaregrwrppaehvbahf`).

**Ground truth (recon 2026-06-12):** `/squad` is a client component inside `ProductShell` fetching `GET /api/squad`; category tabs + gender/sort filters + loading/empty/error states exist; `SquadCard({post, onClick})` renders gender tags; onboarding card 4 already captures `{categories: string[], free_text}` → `students.interests` via `POST /george/profile/api/submit`; auth = `authedHandler({schema?, handler})` with `{user, supabase, body}`; service role = `createAdminSupabaseClient()`; tests = vitest `**/__tests__/**/*.test.ts` with `vi.mock`. ProductShell has a fixed bottom mobile nav (FAB must sit above it).

---

## File structure

| File | Responsibility |
|---|---|
| **bia-admin** `supabase/migrations/20260613000006_squad_board_for_me.sql` | `matched_tags` in rank payload; self-scoped `squad_board_for_me()`; tighten raw-RPC grants |
| `lib/squad/reason.ts` | Pure reason-chip text builder from a rank row |
| `lib/squad/__tests__/reason.test.ts` | Unit tests |
| `app/api/squad/foryou/route.ts` | Authed GET → `rpc('squad_board_for_me')` → `{post_id, reason, rank}` |
| `app/api/squad/foryou/__tests__/route.test.ts` | Route tests (auth, shape, RPC error) |
| `app/squad/page.tsx` (modify) | 为你推荐 section + states + counters header; closed-post filter; FAB |
| `components/squad/ForYouSection.tsx` | The new section: numbered top-3 + reason-chip cards |
| `components/squad/ReasonChip.tsx` | Shared ✦ chip (board cards now; hub ping cards in Phase 3) |
| `app/george/profile/api/submit/route.ts` (modify) | After students upsert: write `interest_tags` + embed facets |
| `lib/matching/interests.ts` | normalizeTag + buildMatchingProfile (tags/facets from form data) |
| `lib/matching/__tests__/interests.test.ts` | Unit tests incl. embed-failure fallback |

---

### Task 1 (bia-admin): migration — `matched_tags` + self-scoped board RPC

**Files:** Create `bia-admin/supabase/migrations/20260613000006_squad_board_for_me.sql` (branch `feat/squad-phase1-rpc` off main in `/Users/mac/Documents/BIA 新生service`).

- [ ] **Step 1: Write the migration**

```sql
-- Squad Phase 1: board RPC hardening + reason payload.
-- 1) hybrid_search_posts_for_user returns matched_tags so the UI can name the
--    overlap ("✦ 你们都喜欢 korean_food"), not just count it.
-- 2) squad_board_for_me(): SELF-SCOPED wrapper — derives auth.uid() → students.id
--    (JIT-provisioning a row via the students_user_id_uidx unique guard), so the
--    client never passes a student_id. Closes the probe hole where any
--    authenticated user could rank posts against ANOTHER student's vectors and
--    infer their interests.
-- 3) Raw per-student RPC becomes service_role-only.

drop function if exists public.hybrid_search_posts_for_user(uuid, int);

create or replace function public.hybrid_search_posts_for_user(
  p_student_id uuid,
  p_match_count int default 30
)
returns table (post_id uuid, rrf_score double precision, semantic_sim double precision,
               tag_overlap int, matched_tags text[], best_facet text)
language sql stable security definer set search_path = public as $$
  with me as (
    select coalesce(interest_tags, '{}') as tags from students where id = p_student_id
  ),
  open_posts as (
    select id, embedding, tags, fts from squad_posts_with_status
    where status = 'open' and category <> '约会'
  ),
  sem as (
    select op.id,
           max(1 - (uiv.vector <=> op.embedding)) as sim,
           (array_agg(uiv.label order by uiv.vector <=> op.embedding))[1] as best_label
    from open_posts op
    join user_interest_vectors uiv on uiv.student_id = p_student_id
    where op.embedding is not null
    group by op.id
  ),
  sem_r as (select id, sim, best_label, rank() over (order by sim desc) as r from sem),
  tag as (
    select op.id,
           array(select unnest(op.tags) intersect select unnest(me.tags)) as overlap_tags
    from open_posts op, me
    where op.tags && me.tags
  ),
  tag_r as (select id, overlap_tags, cardinality(overlap_tags) as overlap,
                   rank() over (order by cardinality(overlap_tags) desc) as r from tag),
  fts as (
    select op.id, ts_rank(op.fts, tq.q) as score
    from open_posts op
    cross join (select to_tsquery('simple',
                  nullif(array_to_string((select tags from me), ' | '), '')) as q) tq
    where tq.q is not null and op.fts @@ tq.q
  ),
  fts_r as (select id, score, rank() over (order by score desc) as r from fts),
  fused as (
    select coalesce(s.id, t.id, f.id) as id,
           coalesce(1.0/(60+s.r),0) + coalesce(1.0/(60+t.r),0) + coalesce(1.0/(60+f.r),0) as rrf,
           s.sim, s.best_label, t.overlap, t.overlap_tags
    from sem_r s
    full outer join tag_r t on t.id = s.id
    full outer join fts_r f on f.id = coalesce(s.id, t.id)
  )
  select id, rrf, sim, coalesce(overlap, 0), coalesce(overlap_tags, '{}'), best_label
  from fused
  order by rrf desc
  limit p_match_count;
$$;

-- Self-scoped wrapper: identity comes from the JWT, never a parameter.
create or replace function public.squad_board_for_me(p_match_count int default 30)
returns table (post_id uuid, rrf_score double precision, semantic_sim double precision,
               tag_overlap int, matched_tags text[], best_facet text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_auth uuid := auth.uid();
  v_student uuid;
begin
  if v_auth is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select id into v_student from students where user_id = v_auth;
  if v_student is null then
    -- JIT provisioning (race-safe via students_user_id_uidx).
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
  return query select * from hybrid_search_posts_for_user(v_student, p_match_count);
end;
$$;

-- Grants: wrapper for signed-in users; raw per-student RPC service_role only.
revoke all on function public.hybrid_search_posts_for_user(uuid, int) from public, anon, authenticated;
grant execute on function public.hybrid_search_posts_for_user(uuid, int) to service_role;
revoke all on function public.squad_board_for_me(int) from public, anon;
grant execute on function public.squad_board_for_me(int) to authenticated, service_role;
```

- [ ] **Step 2: Apply via Supabase MCP** (`apply_migration`, project `ujkaregrwrppaehvbahf`, name `squad_board_for_me`).

- [ ] **Step 3: Verify**

`execute_sql`:
```sql
select p.proname, p.prosecdef,
  (select string_agg(grantee||':'||privilege_type, ',') from information_schema.routine_privileges rp
    where rp.routine_name = p.proname and grantee in ('anon','authenticated','service_role')) as grants
from pg_proc p where p.proname in ('hybrid_search_posts_for_user','squad_board_for_me');
-- expect: raw → service_role only; wrapper → authenticated + service_role
select * from public.hybrid_search_posts_for_user(gen_random_uuid(), 3); -- runs (service ctx), 0 rows
```
Then re-run the Phase-0 integration suite (raw RPC shape changed):
```bash
cd "/Users/mac/Documents/BIA 新生service/bia-admin" && RUN_DB_TESTS=true pnpm exec vitest run lib/matching/__tests__/rpc.integration.test.ts
```
Expected: 4/4 pass (the bilingual test reads `post_id` ranking only — unaffected by the added column).

- [ ] **Step 4: Commit + PR (bia-admin)**

```bash
cd "/Users/mac/Documents/BIA 新生service"
git checkout main && git pull -q && git checkout -b feat/squad-phase1-rpc
git add bia-admin/supabase/migrations/20260613000006_squad_board_for_me.sql
git commit -m "feat(matching): self-scoped squad_board_for_me + matched_tags; raw RPC service-role only"
git push -u origin feat/squad-phase1-rpc
gh pr create --repo BIBOYANG425/bia-admin --base main --title "feat: Squad Phase 1 — self-scoped board RPC" \
  --body "matched_tags in rank payload for reason chips; squad_board_for_me() derives identity from auth.uid() with JIT provisioning; closes the authenticated-grant probe hole on the per-student RPC (now service_role only). Applied + verified on prod; Phase-0 integration suite re-run green."
```

---

### Task 2 (bia-roommate): branch + reason builder (TDD)

**Files:** Create `lib/squad/reason.ts`, `lib/squad/__tests__/reason.test.ts` (branch `feat/squad-foryou-board` off main in `/Users/mac/Code/bia-roommate`).

- [ ] **Step 1: Branch** — `cd /Users/mac/Code/bia-roommate && git checkout main && git pull -q && git checkout -b feat/squad-foryou-board`

- [ ] **Step 2: Write the failing tests**

```ts
// lib/squad/__tests__/reason.test.ts
import { describe, expect, it } from "vitest";
import { buildReason, prettyTag, type RankRow } from "../reason";

const row = (over: Partial<RankRow> = {}): RankRow => ({
  post_id: "p1", rrf_score: 0.03, semantic_sim: 0.4,
  tag_overlap: 0, matched_tags: [], best_facet: null, ...over,
});

describe("prettyTag", () => {
  it("turns snake_case into a readable label", () => {
    expect(prettyTag("korean_food")).toBe("korean food");
  });
});

describe("buildReason (spec §5.1 — reason chips never fabricate)", () => {
  it("names the shared tags when there is tag overlap", () => {
    expect(buildReason(row({ tag_overlap: 2, matched_tags: ["korean_food", "hiking"] })))
      .toBe("✦ 你们都喜欢 korean food · hiking");
  });
  it("caps named tags at 2", () => {
    expect(buildReason(row({ tag_overlap: 3, matched_tags: ["a_b", "c_d", "e_f"] })))
      .toBe("✦ 你们都喜欢 a b · c d");
  });
  it("falls back to the best facet for semantic-only matches above the display floor", () => {
    expect(buildReason(row({ semantic_sim: 0.45, best_facet: "indie_music" })))
      .toBe("✦ 兴趣相近：indie music");
  });
  it("returns null when there is no real reason (no fake chips — spec §11.6)", () => {
    expect(buildReason(row({ semantic_sim: 0.2, best_facet: "indie_music" }))).toBeNull();
    expect(buildReason(row({ best_facet: null }))).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure** — `pnpm exec vitest run lib/squad` → FAIL (module missing).

- [ ] **Step 4: Implement**

```ts
// lib/squad/reason.ts
// Reason-chip text for ranked board cards (spec §5.1/§11.6). A chip must be
// backed by real data: named tag overlap, or a semantic match above
// SEMANTIC_DISPLAY_FLOOR. Anything weaker renders NO chip — never a fake reason.
export interface RankRow {
  post_id: string;
  rrf_score: number;
  semantic_sim: number | null;
  tag_overlap: number;
  matched_tags: string[];
  best_facet: string | null;
}

const SEMANTIC_DISPLAY_FLOOR = 0.35;

export const prettyTag = (t: string) => t.replace(/_/g, " ");

export function buildReason(r: RankRow): string | null {
  if (r.tag_overlap > 0 && r.matched_tags.length > 0) {
    return `✦ 你们都喜欢 ${r.matched_tags.slice(0, 2).map(prettyTag).join(" · ")}`;
  }
  if (r.best_facet && (r.semantic_sim ?? 0) >= SEMANTIC_DISPLAY_FLOOR) {
    return `✦ 兴趣相近：${prettyTag(r.best_facet)}`;
  }
  return null;
}
```

- [ ] **Step 5: Run tests (PASS), commit**

```bash
pnpm exec vitest run lib/squad
git add lib/squad && git commit -m "feat(squad): reason-chip builder — real reasons only"
```

---

### Task 3: `/api/squad/foryou` route (TDD)

**Files:** Create `app/api/squad/foryou/route.ts`, `app/api/squad/foryou/__tests__/route.test.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/squad/foryou/__tests__/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: () => getUser() }, rpc }),
}));

import { GET } from "../route";
const req = () => new Request("http://localhost/api/squad/foryou");

beforeEach(() => { getUser.mockReset(); rpc.mockReset(); });

describe("GET /api/squad/foryou", () => {
  it("401s when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(req())).status).toBe(401);
  });

  it("returns ranked rows with reasons, dropping reasonless weak rows is NOT done here (UI decides)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a1" } }, error: null });
    rpc.mockResolvedValue({ data: [
      { post_id: "p1", rrf_score: 0.03, semantic_sim: 0.7, tag_overlap: 1, matched_tags: ["hiking"], best_facet: "hiking" },
      { post_id: "p2", rrf_score: 0.01, semantic_sim: 0.2, tag_overlap: 0, matched_tags: [], best_facet: "x" },
    ], error: null });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(rpc).toHaveBeenCalledWith("squad_board_for_me", { p_match_count: 30 });
    expect(body).toEqual([
      { post_id: "p1", rank: 1, reason: "✦ 你们都喜欢 hiking" },
      { post_id: "p2", rank: 2, reason: null },
    ]);
  });

  it("502s with recommendations_unavailable on RPC error (board falls back quietly — spec §11.6)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a1" } }, error: null });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("recommendations_unavailable");
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement:

```ts
// app/api/squad/foryou/route.ts
// Personalized board ranking for the signed-in user. Identity is derived inside
// squad_board_for_me() from the caller's JWT (self-scoped, JIT-provisioned) — the
// user's own anon-key session is the right client here, NOT service role.
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildReason, type RankRow } from "@/lib/squad/reason";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase.rpc("squad_board_for_me", { p_match_count: 30 });
  if (error) {
    return NextResponse.json({ error: "recommendations_unavailable" }, { status: 502 });
  }
  const rows = (data ?? []) as RankRow[];
  return NextResponse.json(rows.map((r, i) => ({
    post_id: r.post_id,
    rank: i + 1,
    reason: buildReason(r),
  })));
}
```

- [ ] **Step 3: Tests PASS, commit** — `git add app/api/squad/foryou && git commit -m "feat(squad): /api/squad/foryou — self-scoped ranked recommendations"`

---

### Task 4: 为你推荐 UI — ReasonChip, ForYouSection, page integration

**Files:** Create `components/squad/ReasonChip.tsx`, `components/squad/ForYouSection.tsx`; Modify `app/squad/page.tsx`.

No unit tests (repo has no component-test setup); states are exercised in Task 6's manual smoke. Implement the §11.6 state rows exactly.

- [ ] **Step 1: ReasonChip (shared with hub ping cards in Phase 3)**

```tsx
// components/squad/ReasonChip.tsx
// The ✦ reason chip (spec §11.6): cardinal-on-cream text — gold is background-only
// per the contrast rule. Renders nothing for null reasons (no fake chips).
export default function ReasonChip({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <span
      className="inline-block text-[11px] font-semibold tracking-wide"
      style={{ color: "var(--cardinal)" }}
    >
      {reason}
    </span>
  );
}
```

- [ ] **Step 2: ForYouSection**

```tsx
// components/squad/ForYouSection.tsx
// 为你推荐: approved direction = variant C grid + variant A's numbered black
// rank squares on the top 3 (design G2/G3). States per spec §11.6:
//   loading → SkeletonCard ×3 | empty → warm copy + post CTA | error → handled
//   by the PARENT (quiet fallback tag; section not rendered) | partial → render
//   what cleared, no fake reasons.
"use client";

import Link from "next/link";
import { SquadPost } from "@/lib/types";
import SquadCard from "@/components/squad/SquadCard";
import SkeletonCard from "@/components/SkeletonCard";
import ReasonChip from "@/components/squad/ReasonChip";

export interface ForYouItem { post: SquadPost; rank: number; reason: string | null }

export default function ForYouSection({
  items, loading, onSelect,
}: {
  items: ForYouItem[]; loading: boolean; onSelect: (post: SquadPost) => void;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-display text-[28px] sm:text-[36px]" style={{ color: "var(--black)" }}>
          为你推荐 <span style={{ color: "var(--cardinal)" }}>FOR YOU</span>
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="brutal-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--black)" }}>
            还没有匹配你的局 — 先去逛逛全部，或者发一个？
          </p>
          <Link href="/squad/submit" className="brutal-btn brutal-btn-primary shrink-0">
            发布找搭子 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ post, rank, reason }) => (
            <div key={post.id} className="relative">
              {rank <= 3 && (
                <div
                  aria-label={`第 ${rank} 名推荐`}
                  className="absolute -top-3 -left-3 z-10 w-10 h-10 flex items-center justify-center font-display text-xl text-white border-[3px] border-[var(--black)]"
                  style={{ background: "var(--black)" }}
                >
                  {rank}
                </div>
              )}
              <SquadCard post={post} onClick={() => onSelect(post)} />
              <div className="mt-1 px-1"><ReasonChip reason={reason} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Page integration (`app/squad/page.tsx`)**

Inside `SquadContent`, add for-you state + fetch alongside the existing posts fetch:

```tsx
// new state (next to posts/loading/error):
const [forYou, setForYou] = useState<{ post_id: string; rank: number; reason: string | null }[] | null>(null);
const [forYouLoading, setForYouLoading] = useState(true);
const [forYouUnavailable, setForYouUnavailable] = useState(false);

const fetchForYou = useCallback(async () => {
  setForYouLoading(true);
  try {
    const res = await fetch("/api/squad/foryou");
    if (res.status === 401) { setForYou(null); return; }      // signed-out: section hidden
    if (!res.ok) { setForYou(null); setForYouUnavailable(true); return; } // quiet fallback (§11.6 ERROR)
    setForYou(await res.json());
  } catch {
    setForYou(null); setForYouUnavailable(true);
  } finally {
    setForYouLoading(false);
  }
}, []);

useEffect(() => { fetchForYou(); }, [fetchForYou]);
```

Compose items by joining ranked ids onto the already-fetched `posts` (drop ids not in the list — e.g. became full between calls = PARTIAL state handled naturally), capped at 6 cards:

```tsx
const forYouItems: ForYouItem[] = (forYou ?? [])
  .map(({ post_id, rank, reason }) => {
    const post = posts.find((p) => p.id === post_id);
    return post ? { post, rank, reason } : null;
  })
  .filter((x): x is ForYouItem => x !== null)
  .slice(0, 6);
```

Render above the BROWSE section (only when signed in — `forYou !== null || forYouLoading`):

```tsx
{(forYou !== null || forYouLoading) && (
  <ForYouSection items={forYouItems} loading={forYouLoading || loading} onSelect={setSelected} />
)}
{forYouUnavailable && (
  <p className="mb-6 text-[11px] uppercase tracking-wider" style={{ color: "var(--mid)" }}>
    推荐暂时不可用 — 按最新排序
  </p>
)}
```

One more §11.6 row: dedupe — posts shown in 为你推荐 stay in the BROWSE grid too (familiar browse model unchanged; no removal logic).

- [ ] **Step 4: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add components/squad/ReasonChip.tsx components/squad/ForYouSection.tsx app/squad/page.tsx
git commit -m "feat(squad): 为你推荐 section — numbered top-3 ranks + reason chips + §11.6 states"
```

---### Task 5: derived status on the board + mobile FAB + a11y

**Files:** Modify `app/api/squad/route.ts` (GET), `app/squad/page.tsx`.

- [ ] **Step 1: Board reads derive status; cancelled posts disappear**

In `app/api/squad/route.ts` GET, switch the read to the Phase-0 view and exclude cancelled:

```ts
const { data, error } = await supabase
  .from("squad_posts_with_status")
  .select("*")
  .neq("status", "closed")
  .order("created_at", { ascending: false });
```

(`squad_posts_with_status` is `security_invoker` over `squad_posts`' public-read RLS — anon read still works. `status` rides along on `SquadPost` rows; add `status?: string` to the `SquadPost` interface in `lib/types.ts`.)

- [ ] **Step 2: Mobile FAB (≤768px) per §11.6**

In `app/squad/page.tsx`, replace nothing — add a fixed FAB rendered only on mobile, offset above ProductShell's fixed bottom nav:

```tsx
<Link
  href="/squad/submit"
  aria-label="发布找搭子"
  className="sm:hidden fixed bottom-20 right-4 z-40 brutal-btn brutal-btn-primary !px-5 !py-3 min-h-[44px] min-w-[44px]"
>
  发布 +
</Link>
```

(`bottom-20` clears the bottom navbar; 44px minimums per the a11y rule. The desktop `POST SQUAD →` hero button stays.)

- [ ] **Step 3: a11y sweep on new elements** — rank squares have `aria-label`; ReasonChip is plain text (screen-reader friendly); FAB has `aria-label` + 44px targets; cardinal-on-cream chip text passes 4.5:1 (gold never used for text on cream).

- [ ] **Step 4: tsc + commit** — `git add ... && git commit -m "feat(squad): derived-status reads, cancelled filtered, mobile FAB + a11y"`

---

### Task 6: onboarding wiring — form interests → matching representation

**Files:** Create `lib/matching/interests.ts`, `lib/matching/__tests__/interests.test.ts`; Modify `app/george/profile/api/submit/route.ts`.

The form's category picks are a **controlled vocabulary** — no LLM needed (the Phase-0 extractor is for george-memory prose, Phase 2). Picks become tags directly; facets = embed each pick + the free text + a major/year seed (CEO D6).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/matching/__tests__/interests.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMatchingProfile, formTagsFrom } from "../interests";

const VEC = Array(1536).fill(0.02);

function makeAdmin() {
  const writes: Record<string, unknown[]> = { update: [], upsert: [], delete: [] };
  const admin = {
    from: vi.fn(() => ({
      update: (row: unknown) => ({ eq: () => { writes.update.push(row); return Promise.resolve({ error: null }); } }),
      upsert: (rows: unknown) => { writes.upsert.push(rows); return Promise.resolve({ error: null }); },
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    })),
  };
  return { admin: admin as never, writes };
}

describe("formTagsFrom", () => {
  it("normalizes controlled-vocab picks to snake_case tags", () => {
    expect(formTagsFrom(["study groups", "career events", "food"]))
      .toEqual(["study_groups", "career_events", "food"]);
  });
});

describe("buildMatchingProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes tags and one facet per pick + free-text + seed facet", async () => {
    const { admin, writes } = makeAdmin();
    const embed = vi.fn().mockResolvedValue([VEC, VEC, VEC, VEC]);
    const res = await buildMatchingProfile(admin, "s-1", {
      categories: ["hiking", "food"], freeText: "love kbbq nights",
      major: "Design", year: "sophomore",
    }, embed);
    expect(res).toEqual({ tags: 2, facets: 4, embedded: true });
    expect(embed).toHaveBeenCalledWith([
      "hiking", "food",
      "about me: love kbbq nights",
      "Design student, sophomore year at USC",
    ]);
    const upserted = writes.upsert[0] as { label: string }[];
    expect(upserted.map((r) => r.label)).toEqual(["hiking", "food", "about_me", "academic_seed"]);
  });

  it("embed failure → tags still written, no vectors, embedded=false (spec §11)", async () => {
    const { admin, writes } = makeAdmin();
    const embed = vi.fn().mockRejectedValue(new Error("embed_unavailable"));
    const res = await buildMatchingProfile(admin, "s-1", {
      categories: ["food"], freeText: "", major: null, year: null,
    }, embed);
    expect(res.embedded).toBe(false);
    expect(writes.update.length).toBe(1);
    expect(writes.upsert.length).toBe(0);
  });

  it("no signal at all → no writes beyond empty tags", async () => {
    const { admin } = makeAdmin();
    const embed = vi.fn();
    const res = await buildMatchingProfile(admin, "s-1",
      { categories: [], freeText: "", major: null, year: null }, embed);
    expect(res).toEqual({ tags: 0, facets: 0, embedded: false });
    expect(embed).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement:

```ts
// lib/matching/interests.ts
// Onboarding → matching representation (spec §7.6 cold-start, CEO D6).
// Form picks are a controlled vocabulary: picks ARE the tags (no LLM here —
// george-memory prose extraction is Phase 2). Facets = one embedding per pick
// + the free-text + a major/year seed. Embed failure never blocks the tag
// write (spec §11). Mirrors bia-admin/lib/matching/vector-builder semantics.
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

export interface FormInterests {
  categories: string[];
  freeText: string;
  major: string | null;
  year: string | null;
}

export interface MatchingProfileResult { tags: number; facets: number; embedded: boolean }

export const formTagsFrom = (categories: string[]): string[] =>
  categories
    .map((c) => c.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((t) => t.length > 1);

export function makeEmbedClient(supabaseUrl: string, serviceKey: string): EmbedFn {
  return async (texts: string[]) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!res || !res.ok) throw new Error("embed_unavailable");
    const data = await res.json().catch(() => null);
    if (!data || data.dim !== 1536 || !Array.isArray(data.embeddings) ||
        data.embeddings.length !== texts.length) throw new Error("embed_unavailable");
    return data.embeddings as number[][];
  };
}

export async function buildMatchingProfile(
  admin: SupabaseClient,
  studentId: string,
  form: FormInterests,
  embed: EmbedFn,
): Promise<MatchingProfileResult> {
  const tags = formTagsFrom(form.categories);
  const { error: tagErr } = await admin
    .from("students").update({ interest_tags: tags }).eq("id", studentId);
  if (tagErr) throw new Error(`tag write failed: ${tagErr.message}`);

  const facetTexts: { label: string; text: string }[] = [
    ...tags.map((t) => ({ label: t, text: t.replace(/_/g, " ") })),
    ...(form.freeText.trim() ? [{ label: "about_me", text: `about me: ${form.freeText.trim()}` }] : []),
    ...(form.major || form.year
      ? [{ label: "academic_seed", text: `${form.major ?? "USC"} student, ${form.year ?? "current"} year at USC` }]
      : []),
  ].slice(0, 8); // facet cap, spec §7.3

  if (facetTexts.length === 0) return { tags: 0, facets: 0, embedded: false };

  let vectors: number[][];
  try {
    vectors = await embed(facetTexts.map((f) => f.text));
  } catch {
    return { tags: tags.length, facets: facetTexts.length, embedded: false };
  }

  const { error: upErr } = await admin.from("user_interest_vectors").upsert(
    facetTexts.map((f, i) => ({
      student_id: studentId, label: f.label, vector: JSON.stringify(vectors[i]),
      source: "onboarding", updated_at: new Date().toISOString(),
    })),
    { onConflict: "student_id,label" } as never,
  );
  if (upErr) throw new Error(`vector upsert failed: ${upErr.message}`);
  return { tags: tags.length, facets: facetTexts.length, embedded: true };
}
```

- [ ] **Step 3: Wire into the submit route**

In `app/george/profile/api/submit/route.ts`, after the existing `students` upsert succeeds (the route already has the student row id and uses the service-role client), add — non-fatally:

```ts
// Cold-start matching profile (spec §7.6): picks → tags + embedded facets.
// Failure here must NEVER fail onboarding — log and continue (tags/vectors
// can be rebuilt by the Phase-0 backfill).
try {
  const { buildMatchingProfile, makeEmbedClient } = await import("@/lib/matching/interests");
  const embed = makeEmbedClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const result = await buildMatchingProfile(adminSupabase, studentId, {
    categories: body.interests?.categories ?? [],
    freeText: body.interests?.free_text ?? "",
    major: body.identity?.major ?? null,
    year: body.identity?.year ?? null,
  }, embed);
  console.log(`[matching] onboarding profile built for ${studentId}:`, JSON.stringify(result));
} catch (e) {
  console.error("[matching] onboarding profile build failed (non-fatal):", e);
}
```

(Adapt the exact variable names — `adminSupabase`/`studentId` — to the route's actual locals when implementing; the route already reconciles the students row and holds a service-role client.)

- [ ] **Step 4: Tests PASS + full gates + commit**

```bash
pnpm exec vitest run lib/matching lib/squad app/api/squad/foryou
pnpm test 2>&1 | tail -3      # whole repo suite still green
pnpm exec tsc --noEmit
git add lib/matching app/george/profile/api/submit/route.ts
git commit -m "feat(matching): onboarding interests → tags + embedded facets (cold-start wiring)"
```

---

### Task 7: full verification + smoke + PR

- [ ] **Step 1: Full repo gates** — `pnpm test` green, `pnpm exec tsc --noEmit` clean, and the Vercel-equivalent build: `env -i PATH="$PATH" HOME="$HOME" NODE_ENV=production npx --no-install next build` (per AGENTS.md, route files export only HTTP handlers — `foryou/route.ts` complies).

- [ ] **Step 2: Live smoke (manual or browse tool)** — `pnpm dev`; signed-out `/squad` shows the classic board (no 为你推荐); signed-in (test account) shows the section with rank squares + chips, or the warm empty card; mobile viewport (375px) shows the FAB above the bottom nav.

- [ ] **Step 3: PR**

```bash
git push -u origin feat/squad-foryou-board
gh pr create --repo BIBOYANG425/bia-roommate --base main \
  --title "feat: Squad Phase 1 — 为你推荐 ranked board + cold-start wiring" \
  --body "Personalized /squad for signed-in users: 为你推荐 section (approved design: variant C structure + variant A numbered top-3 ranks), ✦ reason chips backed by real match data only, §11.6 states (skeleton/warm-empty/quiet-error/partial), derived-status reads (cancelled posts vanish), mobile FAB + a11y. Onboarding wiring: interest picks → interest_tags + embedded facets via the Phase-0 embed fn (tags-only fallback). Companion bia-admin PR adds the self-scoped squad_board_for_me RPC (closes the per-student probe hole). Spec: docs/superpowers/specs/2026-06-12-squad-reimagined-design.md §5.1/§10-P1/§11.6."
```

- [ ] **Step 4: Verify checks** (CodeRabbit + Vercel) green on BOTH PRs; fix findings.

---

## NOT in scope (Phase 1)
- george "describe it" prefill assist (Phase 2 — needs the george draft endpoint + cloud deploy).
- Pings, hub, receiving controls (Phases 2-3). Coordination (Phase 4).
- Desktop left filter-rail re-layout — the existing category tabs + filters fulfill the approved structure; revisit only if Phase-3 hub work makes a shared rail cheap.
- Re-ranking cadence/caching (at 1,500 users and ~200 posts, per-load RPC is fine).

## Acceptance criteria
- Signed-in user with interests sees 为你推荐 with numbered top-3 + truthful reason chips; signed-out/no-profile sees today's board unchanged.
- A new onboarding completion immediately produces `interest_tags` + facet vectors (verifiable in DB) and a personalized board on first visit.
- Cancelled posts vanish from the board; `推荐暂时不可用` quiet-fallback shows when the RPC errors; no fake reason chips ever render.
- The raw per-student RPC is no longer callable by `authenticated`.
- All gates green in both repos; both PRs open with checks passing.
