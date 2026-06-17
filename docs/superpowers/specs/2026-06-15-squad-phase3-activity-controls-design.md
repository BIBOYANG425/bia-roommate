# Squad Phase 3 — Web Activity Hub + Receiving Controls

> Phase 3 of the squad-reimagined system (`2026-06-12-squad-reimagined-design.md`).
> Phases 0 (matching engine), 1 (为你推荐 board, PR bia-roommate#82 / bia-admin#17),
> and 2 (george push loop: ping engine + find-people concierge + /pings consent,
> george `fix/imessage-rapid-fire-abort`) are built. Phase 3 surfaces the push
> loop's pings on the **web** so a user can see who pinged them, understand and
> control what feeds the matcher, and tune what they receive — without duplicating
> george's join/coordination logic.

**Status:** approved 2026-06-15.

**Goal:** A signed-in user can, on the web, (1) read their incoming pings and signal
interest, (2) see and edit the signals that feed their matching, and (3) control
whether/how they get pinged — all under the spec's privacy model (pings opt-in
default-off, match-graph reach-only, `students.id` canonical identity).

---

## 1. Scope

**In scope**
- **`/squad` → new `我的` tab** (activity, read + signal): PINGS inbox, 我的局 (organizer,
  aggregate reach), 已加入 (joined).
- **`/account/george` → new `Squad 接收设置` section** (settings, read + write): 匹配依据
  (view / add / remove interest signals) + receiving controls (`user_match_prefs`).
- New self-scoped Postgres RPCs (bia-admin migration) for every read/write, plus an
  add-interest web route that embeds via the existing `embed` Edge Function.
- bia-roommate API routes, components, and tests.

**Out of scope (deferred)**
- **george-proactive follow-up** on a web-expressed interest (george reading
  `squad_pings.response='joined'` and reaching out unprompted) → **Phase 4 coordination.**
  Phase 3's handoff is *user-initiated* (web → tap → message george), so **Phase 3 needs
  zero george-code changes.**
- After-join coordination (confirm time/place, reminders, drop-out re-pings, 完成
  marking) → Phase 4.
- Realtime inbox updates (Supabase realtime) → not needed; on-load fetch + revalidate.

## 2. Architecture — two surfaces

Per the IA decision, activity and settings live in different places, each next to
where the user already expects them:

```
/squad        [ 为你推荐 | 全部 | 我的 ←new ]
  我的 tab (activity, read + signal):
    • PINGS 收件箱  — my squad_pings + ✦ reason chip + 加入 / 忽略
    • 我的局        — posts I created + derived status + "已 ping N 人" (aggregate)
    • 已加入        — posts I'm a member of

/account/george   (settings, read + write — beside heartbeat/george consent)
  Squad 接收设置 section:
    • 匹配依据       — interest tags + facet labels; remove (×) + add (re-embeds)
    • 接收控制       — pings_enabled (default OFF), weekly cap, quiet hours, category scope
```

Both surfaces are signed-in only (ProductShell gate). All data flows through
self-scoped RPCs keyed on `auth.uid() → students.id` (the proven
`squad_board_for_me()` pattern: identity from the JWT, never a parameter), because
`squad_pings` / `user_interest_vectors` / `user_match_prefs` are deny-all RLS.

## 3. The 加入 handoff (web signals interest; george completes the join)

The web inbox is a **viewer + interest-signal** surface. It never writes
`squad_members`. george (iMessage) stays the single broker that completes a join,
so join/coordination logic isn't duplicated.

- **加入** → `squad_respond_to_ping(ping_id, 'joined')` records `response='joined'` +
  `responded_at` (an interest signal). The card then flips to a confirm affordance:
  **"george 帮你报名 — 去 iMessage 确认"** with a one-tap `sms:`/`imessage:` deep-link to
  the george pool number (`GEORGE_IMESSAGE_PHONE`), prefilled (e.g.
  `我想加入 拼车局 K-town`). The user messages george; george's existing concierge
  completes the actual join (Phase 2). No `squad_members` write on web.
- **忽略** → `squad_respond_to_ping(ping_id, 'declined')` records `response='declined'`.
- **Already responded / 已满 / expired / closed** posts: the action row is disabled and
  shows status (derived from `squad_posts_with_status`); no re-respond.

## 4. Data access — new RPCs (bia-admin migration)

All authenticated-callable, `SECURITY DEFINER`, self-scoped via `auth.uid()` →
`students.user_id` (JIT-provision if absent, reusing the `squad_board_for_me`
resolver). Grants: `REVOKE ALL FROM public, anon; GRANT EXECUTE TO authenticated`.

| RPC | Returns / effect | Notes |
|---|---|---|
| `squad_my_pings()` | rows: `ping_id, post_id, category, location, current_people, max_people, status (derived), score, response, responded_at, created_at, matched_tags text[], best_facet text` | recipient = me only; newest first; joins `squad_posts_with_status` for derived status + `squad_pings` for the chip inputs |
| `squad_respond_to_ping(p_ping_id uuid, p_response text)` | writes `response` + `responded_at=now()` on **my** ping only | `p_response IN ('joined','declined')`; raises if the ping's `recipient_student_id <> me`; a single response is final — raises (or no-ops) if `response` already set (§7) |
| `squad_my_posts()` | my created posts + derived status + `reach_count int` (= `count(squad_pings WHERE post_id=p)`) | **aggregate only** — no recipient ids, no response breakdown |
| `squad_my_joined()` | posts where `squad_members.student_id = me` + derived status | |
| `squad_my_prefs()` | my `user_match_prefs` row (auto-creates defaults if none) | pings_enabled default false |
| `squad_set_prefs(p_pings_enabled bool, p_allowed_categories text[], p_weekly_cap int, p_quiet_start smallint, p_quiet_end smallint, p_channel text)` | upsert my `user_match_prefs` | re-validates CHECK ranges (cap≥0, hours 0–23, channel in imessage/web/email) |
| `squad_my_signals()` | `interest_tags text[]` + facet rows `(label, source, updated_at)` from `user_interest_vectors` | the 匹配依据 view; **whitelisted signals only** — never raw memory blocks |
| `squad_remove_interest(p_tag text)` | remove `p_tag` from my `students.interest_tags` + delete my `user_interest_vectors WHERE label=p_tag` | cheap; no embedding |
| `squad_add_interest(p_tag text, p_vector float8[])` | append `p_tag` to my `interest_tags` (dedup) + if `p_vector` non-null, upsert `user_interest_vectors(student_id=me, label=p_tag, vector=p_vector, source='web')` | tag is always added; facet vector is best-effort (see add-interest route) |

**Add-interest route** (`POST /api/squad/signals` with `{ tag }`): server route
embeds the tag via the **existing `embed` Edge Function** —
`supabase.functions.invoke('embed', { body: { texts: [tag] } })` → `{ embeddings:
number[][] }` (1536-dim, `text-embedding-3-small`). Then calls
`squad_add_interest(tag, embeddings[0])`. Per the embed contract ("never block a
write on this function"): if embed returns non-200, the route still calls
`squad_add_interest(tag, null)` so the **tag-overlap leg** gets it and the semantic
facet catches up later; the UI toasts "已添加" with a soft "语义匹配稍后生效" note.

## 5. Components & routes (bia-roommate)

**`/squad` `我的` tab**
- `app/squad/page.tsx` — add a third tab (`为你推荐 | 全部 | 我的`); `我的` renders `MyActivity`.
- `components/squad/MyActivity.tsx` — three labelled streams; reuses `SquadCard` + `ReasonChip`.
- `components/squad/PingInbox.tsx` — ping cards (reason chip from `matched_tags[0] ?? best_facet`, derived status, `加入`/`忽略`, post-respond confirm affordance with the george deep-link).
- `MyPosts` / `MyJoined` — `SquadCard` lists; `MyPosts` shows the aggregate `已 ping N 人`.
- API: `GET /api/squad/me/pings`, `POST /api/squad/me/pings/:id/respond`, `GET /api/squad/me/posts`, `GET /api/squad/me/joined` — each `createServerSupabaseClient()` → `auth.getUser()` → the matching self-scoped RPC (mirrors `foryou/route.ts`).

**`/account/george` settings**
- `app/account/george/_components/SquadSettingsSection.tsx` — wraps `MatchSignals` + `ReceivingControls`; placed beside the existing `HeartbeatConfigSection`.
- `MatchSignals` — chips for `interest_tags` + facet labels, each with remove (×); an add input.
- `ReceivingControls` — `pings_enabled` toggle, weekly-cap stepper, quiet-hours range, category multiselect (`allowed_categories`; null = all).
- API under `app/account/george/api/` (matching `heartbeat-config`/`profile-block`): `squad-prefs/route.ts` (`GET`/`PUT` → `squad_my_prefs`/`squad_set_prefs`), `squad-signals/route.ts` (`GET` → `squad_my_signals`; `POST` add → embed + `squad_add_interest`; `DELETE` remove → `squad_remove_interest`).

## 6. Privacy model

- **Organizer reach is aggregate-only.** `squad_my_posts()` returns a `reach_count`,
  never recipient identities and never a joined/declined breakdown (spec CEO D7).
- **Recipient reads are self-scoped.** Every RPC derives identity from the JWT; a user
  can only ever read their own pings/prefs/signals. Deny-all RLS underneath.
- **匹配依据 surfaces whitelisted signals only** — `interest_tags` + `user_interest_vectors`
  labels (which are themselves derived from whitelisted sources). Raw memory blocks
  (relationships, identity, state) never appear and never feed vectors.
- **約會** stays excluded from the matcher (unchanged from Phase 0/2).

## 7. Error handling

- **Respond races:** `squad_respond_to_ping` is ownership-checked; responding to a
  ping that isn't mine raises. A ping already responded shows its state and disables
  re-respond (a single response is final for Phase 3).
- **Respond to a full/expired post:** allowed to record `declined`; `加入` is disabled
  with the status shown (we don't block expressing past-interest, but we don't pretend
  the 局 is joinable).
- **add-interest embed failure:** tag still added (tag-overlap leg), facet skipped,
  soft toast. **Never** blocks the write.
- **prefs write:** optimistic UI, revalidate on response; CHECK violation → restore
  prior value + toast.
- **Unauthed:** API routes return 401; UI routes gate via ProductShell.

## 8. Freshness & unread

- On-load fetch + revalidate on tab/window focus. No realtime subscription.
- **Unread pings** = `response IS NULL`, counted client-side from the
  `squad_my_pings()` result (no extra RPC). Show the count as a badge on the `我的` tab.

## 9. Testing

- **bia-admin RPCs** (pgTAP or SQL fixtures): self-scoping (user A can't read B's
  pings/prefs/signals), `squad_my_posts` returns aggregate-only (no identities),
  `squad_respond_to_ping` writes only the caller's ping and rejects others,
  `squad_set_prefs` enforces CHECK ranges, `squad_add/remove_interest` mutate only the
  caller's rows.
- **bia-roommate**: component tests (PingInbox renders chip + status + actions;
  MatchSignals add/remove; ReceivingControls toggle/validation) and API-route tests
  (401 when unauthed; routes call the right RPC; add-interest degrades on embed
  failure).

## 10. Files & sequencing

**bia-admin (first):**
- `supabase/migrations/<ts>_squad_phase3_rpcs.sql` — the 8 RPCs in §4.
- RPC tests.

**bia-roommate (second):**
- `app/squad/page.tsx` (+`我的` tab), `components/squad/{MyActivity,PingInbox}.tsx`.
- `app/account/george/_components/SquadSettingsSection.tsx` (+`MatchSignals`,
  `ReceivingControls`), wired into `app/account/george/page.tsx`.
- API routes under `app/api/squad/me/*` and `app/account/george/api/squad-*` (or
  `app/api/squad/{prefs,signals}` — match the existing account-api location).
- `lib/squad/*` helpers as needed (reuse `reason.ts`).
- Component + route tests.

**george:** unchanged (handoff is user-initiated).

**Cross-repo notes:**
- The bia-admin migration must be applied to prod (`ujkaregrwrppaehvbahf`) before the
  bia-roommate routes work end-to-end. The `embed` Edge Function already exists.
- The 加入 confirm affordance deep-links to the george pool number. bia-roommate needs
  that number as a public env var on Vercel (e.g. `NEXT_PUBLIC_GEORGE_IMESSAGE_PHONE`),
  mirroring george's `GEORGE_IMESSAGE_PHONE`. If unset, fall back to a plain
  "iMessage george 报名" instruction without the prefilled deep-link.
