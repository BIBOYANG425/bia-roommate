# 找搭子 (Squad) Reimagined — Design

**Date:** 2026-06-12
**Status:** Draft for review
**Repos touched:** `bia-roommate` (web board, profile hub, APIs), `george` (iMessage/web-chat push loop, memory), Supabase (matching engine; migrations land in `bia-admin`)

---

## 1. Problem

The current 找搭子 is a **bulletin board**: a brutalist `/squad` page with a grid of cards (categories 拼车/自习/约会/健身/游戏/其它), filters, a submit form, and a join-until-full modal, backed by `squad_posts` / `squad_members`.

The founder's read (validated in brainstorming): **a board is the wrong shape.** The demand is real, but the behavior is organic. People already post on RedNote to attract peers, and they drop "有人去X吗" in the WeChat group. Both are zero-friction and in-the-flow. A structured board asks them to stop, switch apps, pick a category, set `max_people` / `gender_restriction` / `deadline`, and write a form. That ceremony is the friction that keeps the board empty, so it feels dead. The group-chat ask is perfect except it is **lossy**: it scrolls away in minutes, only whoever is online sees it, and there is no way to track who is in or to nudge follow-through.

## 2. The reframe

> Stop building a better board. Capture the natural ask and add the one missing thing: **getting it in front of the few people who would actually want in.**

The reimagined 找搭子 is **one pool of 局s** with two discovery modes over a shared matching engine:

- **Pull (web board), made smart.** The board stays, but the matching engine ranks it **"for you"** so it feels alive even with few posts.
- **Push (george), made effortless.** You tell george in plain words; george drafts the post for you; you approve; the engine pings the handful of people most likely to want in.
- **Manage (profile).** A **"Your Activity"** hub is the personal control panel: what you are into, who can reach you, and your live 局s.

Same posts, same engine, three surfaces.

### Rejected alternatives (decision log)
- **Keep the form-first board as the primary UX.** Rejected: that ceremony is the core friction; RedNote already owns public discovery.
- **Hand-rolled weighted matcher** (the old roadmap's `squad_matcher.ts`, interests 1.0 / major 0.5 / year 0.3). Rejected: reinvents similarity search badly; superseded by pgvector hybrid search (see §6).
- **1:1 "warm intro" matchmaking** ("you'd hit it off with [name]"). Rejected: that is a different, higher-risk product; Squad is activity-first group-up, not friend/dating pairing.
- **Pure ephemeral status feed** (Stories-style). Rejected: still board-shaped and redundant with RedNote.

## 3. Goals / Non-goals

**Goals**
- Make posting a 局 feel like talking, not filling a form (george drafts it).
- Make the board feel alive at low liquidity via "for you" ranking.
- Reach beyond iMessage: web is a first-class (arguably primary) door, since much of BIA is WeChat-first / Android (no iMessage).
- Reuse the existing `squad_posts` / `squad_members` pool and the existing pgvector stack. No new infrastructure if quality holds.
- A profile "Your Activity" hub that is **cross-feature-ready** (Events, 集运, etc. plug in later) but wired only for Squad now.

**Non-goals (this iteration)**
- Romantic/dating matching. Squad is platonic. george never creates or surfaces 约会 posts (see §8).
- A full cross-feature activity hub for every BIA function. We design the hub structure to generalize; we only wire Squad streams now.
- Collaborative-filtering / interaction-history recommenders. Content-based matching only (cold-start friendly).
- WeChat push channel. Designed for, not built now (iMessage + web first).

## 4. Architecture

```
                         ┌──────────────────────────────┐
        web board  ──────▶                              │
        (/squad,   ◀──────   Supabase: squad_posts /     │
         "for you")         squad_members  +  matching   │
                            engine (pgvector hybrid      │
        george     ──────▶   search RPCs) + embeddings    │
        push loop  ◀──────                               │
        (iMessage +         user interest vectors +      │
         web chat)          match prefs + pings          │
                         └──────────────────────────────┘
        profile  ───────▶  "Your Activity" hub (reads the above)
```

Four units, each with one job and a clear interface:

1. **Matching engine** (Supabase Postgres). Given a user → rank posts; given a post → rank users. One `hybrid_search` family of RPCs. §6.
2. **Web board** (bia-roommate). Browse, but "for you" ranked; lower-friction posting. §5.1.
3. **george push loop** (george). Natural language → drafted post → approval → targeted pings. §5.2.
4. **"Your Activity" hub** (bia-roommate profile). Manage interests, receiving controls, and your live 局s. §5.3.

## 5. Surfaces

### 5.1 Web board, "for you" ranked (`/squad`)

**Approved visual direction (design review D3): variant C's structure + variant A's rank treatment.** Filter rail (categories with counts, 只看好友, gender filter) + a loud `+ 发布找搭子` CTA + a 为你推荐 section where the **top 3 matches carry numbered black-square rank blocks** (A's signature), above an asymmetric card grid. Mockups: see Approved Mockups table (§11.6).

- **Default sort becomes relevance, not reverse-chron.** For a signed-in user, posts are ranked by the matching engine (§6) against their interest profile, with a **✦ reason chip** per card in cardinal red ("✦ 你们都喜欢 korean food", "✦ 3 个同届的也在"). Signed-out or no-profile users fall back to today's newest-first.
- **Posting: the form leads; george assists (design review D6 — revises the earlier describe-box-primary decision and resolves the eng-review tension).** `/squad/submit` keeps the structured form as the visible primary path. A one-line describe-box sits above it ("懒得填？描述一句，george 帮你填") that calls the george draft endpoint to **prefill the form fields**; the user reviews and submits — the form IS the approval step. If george is down or slow, the box hides/degrades and the form is untouched; web posting is never blocked on george. (Phase 1 ships form-only; the prefill assist arrives with Phase 2's george endpoint.)
- **Trust + identity on cards.** Extends the live `SquadCard` signals (avatar/initial in category color, school, relative time, capacity, 已满): add verified-BIA mark, cohort, shared-interest chip, and **keep the gender-restriction tag** (design feedback: "surfaces restrictions as well").
- **After joining.** A george-brokered intro / lightweight thread rather than only exposing a phone number (script in §11.6). Reuses `squad_members` + capacity trigger.
- Keeps the existing category tabs, gender/sort filters, and `squad_member_counts` view.

### 5.2 george push loop (iMessage + web chat)

The same loop on both `/george/chat` (web, reaches Android/non-iMessage users) and iMessage:

1. **Capture.** User: "想周五去吃韩烤，找几个人."
2. **Draft.** george extracts `{category, content, when→deadline, location, max_people, tags}` and shows a one-bubble draft.
3. **Approve.** "send it" / "改成周六". One human-in-the-loop confirmation before anything broadcasts.
4. **Insert + match.** Post is written to `squad_posts` (also appears on the web board). The engine ranks users (§6); the top few **within their receiving controls and above a similarity threshold** get a ping.
5. **Respond.** "in" → george adds a `squad_members` row (atomic capacity), brokers the intro, nudges the plan.

This is george-as-organizer (局主 labor moves to george), not a CRUD form over a board.

### 5.3 "Your Activity" profile hub

The profile spine. Designed cross-feature; Squad is the first stream.

**Approved visual direction (design review D4/D5): variant B's layout, connected-system treatment.** Three numbered streams (①我的局 ②已加入 ③PINGS) + a "WHAT WE MATCH YOU ON" strip (interest chips + the default-OFF ping toggle) + warm empty states — but **without B's left nav rail**: the hub renders inside ProductShell under the profile area (the top nav IS the navigation). Connectedness comes from shared language, not chrome: the numbered black squares rhyme with the board's rank blocks, the **✦ reason chip is one shared component** across board cards and ping cards, status tags are the same `brutal-tag`s, and cross-links wire the surfaces (hub items → their board post; the board's 为你推荐 header → "tune what we match you on"; ping accept → the same join flow as the board modal).

- **Your 局s** — what you posted, who's in, status (open / full / expired).
- **Joined** — 局s you're in.
- **Pings** — incoming matches awaiting your reply.
- **What we match you on** — the editable view of your interest tags/facets (§7), with the privacy guarantee that only whitelisted signals feed matching.
- **Receiving controls** — mute, "only ping me for [categories]", weekly ping cap, quiet hours, channel (iMessage / web / email). §8.

Structured so Events, 集运, blog, etc. become additional streams later without a redesign.

## 6. Matching engine

**Decision: pgvector hybrid search, entirely inside Supabase. No new infrastructure.** (Selected via deep-research, 2026-06-12; full report archived in the team transcript. pgvector is already enabled and in use on this stack with `vector` columns + cosine indexes.)

**Approach: content-based matching.** No training, no interaction history required, so it works from a user's first interest tag (cold-start friendly).

### 6.1 Three signals, fused

Each post and user is represented by (a) a tag set and (b) one or more embeddings. Three signals, each catching a different thing:

| Signal | Mechanism | Catches |
|---|---|---|
| **Semantic** | pgvector cosine distance between embeddings | meaning, not words: "rock climbing" ↔ "bouldering", "韩烤" ↔ "korean bbq" |
| **Keyword** | tsvector full-text rank | exact tag/term hits; cheap; robust when text is short |
| **Tag overlap** | Postgres array `&&` / intarray | works from the user's first tag, no history (cold-start) |

**Fusion: Reciprocal Rank Fusion (RRF).** Each signal yields a ranked list; RRF blends *ranks* (`score = Σ wᵢ / (k + rankᵢ)`) so we never normalize incompatible score scales. Per-leg weights are tunable; we lean tag-overlap early and shift toward semantic as profiles fill. Implemented as one Supabase `hybrid_search(...)` Postgres function, callable from TypeScript via `supabase.rpc(...)`.

### 6.2 Symmetric in shape, not in legs (eng review)

- **Board "for you" (posts-direction):** hold the user fixed, rank posts. All three legs apply — posts have a `fts` document.
- **Pings (users-direction):** hold the post fixed, rank users. **Semantic + tag-overlap legs only** — users have no fts document (`user_match_tags` is an array, and lexical matching is already covered by tag overlap). This direction is also the harder query: max-over-facets requires a per-user lateral / `DISTINCT ON` aggregate over `user_interest_vectors`. Implemented as two RPCs (`hybrid_search_posts_for_user`, `match_users_for_post`), not one parameterized function.

### 6.3 Thresholding (anti-spam) — gate BEFORE fusion (eng review)

Pings are **not** "notify everyone in rank order," and the gate cannot be an RRF-score threshold: RRF outputs are scale-free rank fusions (they depend on list sizes and `k`, not similarity), so an absolute cutoff on them is meaningless. The mechanism is a **pre-fusion candidate gate**: a user enters the candidate set only if their best-facet raw cosine ≥ `SEMANTIC_FLOOR` **or** tag-overlap count ≥ `TAG_FLOOR`. RRF then ranks survivors only, and the ping budget (§8) caps how many of the top-ranked are actually sent. A post with no candidates above the floors pings no one. This is the "don't send 5 lukewarm suggestions" rule expressed as a gate the implementation can actually build.

### 6.4 Embedding model — multilingual is required

Our text is **bilingual and Chinese-heavy** (韩烤, 自习, 拼车). Supabase's free native `gte-small` is English-leaning and embeds Chinese weakly, so it is **not** sufficient for the semantic leg. We use a **multilingual** model: default **OpenAI `text-embedding-3-small`** (1536-dim, matches the existing `vector(1536)` columns, strong bilingual quality), with open `bge-m3` / `multilingual-e5` as self-host alternatives. The tag-overlap and keyword legs are language-agnostic and carry cold-start while embeddings warm up. Cost is one embedding call per new post and per profile refresh — trivial at our volume. **Dimensions are fixed at 1536** for consistency with existing vectors.

## 7. User interest vector (the core quality lever)

A post's vector is a single embedding of its text, computed once at creation. The **user** representation is where match quality is won or lost.

### 7.1 Sources, with a privacy whitelist

george memory has 6 blocks; **only interest-relevant, non-sensitive ones feed matching:**

- **Structured profile:** `students.interests[]`, `major`, `year`.
- **george memory `interests` block** (curated interest prose).
- **george memory `state` block** (current/recent, **time-decayed**).
- **Behavior:** categories of 局s joined and events attended (implicit, strong signal).
- **Excluded from matching:** `relationships`, `identity`, and `george_notes` — never read at all. The `state` block is **never embedded raw** (eng review): the LLM tag/facet **extractor is the filter** — it reads `state` and emits only interest-shaped items ("getting into bouldering") into the facet document; everything else in the block (stress, health, relationships) is dropped at extraction. Only extractor output is ever embedded.

The profile hub shows the user exactly "what we match you on" and lets them edit/remove items, so nothing private leaks into who-gets-pinged.

### 7.2 Two products

1. **Tags** (feed tag-overlap + keyword legs): george/LLM extracts a normalized tag set from the prose + `interests[]`, collapsed to a controlled vocab so `韩烤 / kbbq / korean_bbq` become one tag.
2. **Vectors** (feed the semantic leg): embeddings of the assembled text.

### 7.3 Faceted vectors, not one averaged centroid

The decision that most affects quality. A student into *bouldering AND korean food AND valorant* has no single center; averaging produces a blurry midpoint that matches none strongly.

Instead, store **a small set of facet vectors per user** (one per salient interest cluster, capped ~5–8) in `user_interest_vectors(user_id, label, vector, source, updated_at)`. A user's similarity to a post = the **max over their facets** (their single best-matching interest). In pgvector this is `ORDER BY vector <=> post_vec LIMIT 1` per user, so it is no harder operationally and far more accurate: you match if *any* facet is close, which is how people actually work.

(v1 fallback: a single centroid vector ships faster; the schema above allows going faceted without a migration rewrite. Recommendation: faceted from the start, since pgvector makes it cheap.)

### 7.4 Refresh

The george heartbeat layer already updates memory blocks. Hook the profile-document rebuild + re-embed into that path, debounced, so facets refresh when george learns something new or the user edits interests. Posts embed once at creation. ~1,500 users is trivial volume.

### 7.5 Worked example

Lily's facets: `[hiking/outdoors]`, `[korean food]`, `[indie music]`; tags `{hiking, korean_food, indie_music, design}`. A 局 drops: "周五晚 K-town 韩烤，3缺2", tags `{food, korean, kbbq}`. Scored by her *best* facet (`[korean food]` ≈ "韩烤") she ranks high and clears the ping threshold; a centroid would have diluted her to a meh score and dropped her below it. Faceted catches her.

### 7.6 Cold-start seeding (CEO review D6)

At launch no one has tags or vectors, so all three legs are empty and the board would rank near-random. With pings opt-in (low early reach), the board is the primary discovery surface, so day-one personalization matters most here. Bootstrap on two fronts: (a) **capture a few interests at onboarding** via a one-screen "pick a few things you're into" step on the existing Slice B form; (b) **seed** initial tags from `major` / `year` and any existing behavior (events attended, prior squad activity). george's passive memory inference then enriches profiles over time.

## 8. Privacy, safety, consent

- **Platonic only.** george never creates or surfaces 约会 posts. 约会 posts may still exist and be browsable on the web board via the category filter, but they are excluded from "for you" ranking and from all pings. (Whether to keep 约会 at all is an open product call, §13.)
- **Underage awareness.** No alcohol-centric or romantic framing/targeting to users with `year=freshman` or known age < 18.
- **Matching-data whitelist.** Only the signals in §7.1 feed vectors/tags; sensitive memory blocks are excluded by construction.
- **Approve-before-broadcast.** A post is only created and pings only fire after the poster confirms the draft.
- **Pings are OPT-IN, off by default (CEO review D5).** A user is never pinged until they explicitly enable pings in settings (offered as a one-tap step when they set interests at onboarding: "want george to tell you when your kind of 局 pops up?"). Strongest consent posture. Consequence: the "for you" board is the **primary discovery surface**; pings are a bonus for the opted-in subset.
- **Receiving controls + budget.** Opted-in users can still mute, scope pings to chosen categories, set a **weekly ping cap**, set quiet hours, and pick a channel. Pings respect all of these. Defaults are conservative; the whole feature dies if it feels like spam.
- **Identity exposure.** Joining brokers a george intro rather than dumping a raw contact; what others see about a user is governed by their profile privacy setting.
- **Match-graph privacy (CEO review D7).** The ping recipient list is private: only george and each recipient know a ping happened. The organizer sees aggregate **reach** ("pinged 8 people") but never recipient identities and never who declined; they see identities only for people who actually JOIN. This protects the interest/social graph the matcher creates and keeps people willing to be pingable.

## 9. Data model changes (design-level; exact DDL in the plan)

**Migration ownership (eng review):** ALL new DDL in this project lands in `bia-admin/supabase/migrations` — full stop. Legacy CREATEs live scattered (squad in bia-roommate, students/memory in george), but the live DB is one database and bia-admin is its declared schema owner; new ALTERs/CREATEs do not perpetuate the split. Apply via the Supabase MCP, per bia-admin's workflow.

**Identity model (eng review D1):** `students.id` is the canonical key for every matching-engine table. A shared **identity-resolution helper** maps any surface identity to it — `auth.users.id` via `students.user_id`, iMessage phone handle via the existing handshake link — and **JIT-creates a `students` row** for web-auth users who don't have one yet (the `students.user_id` bridge is sparse today; most web signups have no students row).

- **`squad_posts`** (extend): `embedding vector(1536)`, `tags text[]`, generated `fts tsvector` (from `content` + `category`), `created_via text` (web/george), `created_by_student_id uuid → students` (nullable; set for george-created posts where `user_id` has no auth row), `cancelled_at timestamptz`. **No stored status column** (eng review D4): open/full/expired derive from `current_people`/`max_people`/`deadline` in a `squad_posts_with_status` view all consumers use; only cancellation is real state.
- **`squad_members`** (extend): add `student_id uuid → students`, relax the auth-only `user_id NOT NULL` so george-brokered joins are possible. Capacity trigger audited to fire on both key paths; otherwise unchanged.
- **`user_interest_vectors`** (new): `(id, student_id → students, label text, vector vector(1536), source text, updated_at)`. Faceted user vectors.
- **`user_match_tags`** (column on `students`): normalized `interest_tags text[]` for the tag-overlap leg.
- **`user_match_prefs`** (new): `(student_id, pings_enabled bool DEFAULT false, allowed_categories text[], weekly_ping_cap int, quiet_hours, channel)`. Receiving controls; `pings_enabled` default-false is the D5 opt-in.
- **`squad_pings`** (new): `(id, post_id, recipient_student_id, score, channel, status text (sent/suppressed_no_channel/suppressed_cap/suppressed_quiet_hours), sent_at, responded_at, response)`. Drives dedup, cap enforcement, the "Pings" stream, and the no-silent-drop rule (eng D3).
- **RPCs:** `hybrid_search_posts_for_user(...)` (3 legs) and `match_users_for_post(...)` (semantic + tags, lateral max-over-facets), per §6.2.
- **RLS (eng review — D7's enforcement layer):**
  - `user_interest_vectors`, `user_match_prefs`, `squad_pings`: **deny-all to anon/authenticated**; service-role only. Recipient-facing reads go through API routes that scope to the caller; the organizer-facing surface exposes only `count(*)` reach, never recipient rows.
  - `squad_members`: the existing `"viewable by owner"` policy means an organizer cannot list who joined their own 局 — **rewrite**: members visible to (a) themselves and (b) the post's organizer. Required by the hub's "who's in" and CEO-D7.
- **Indexes:** HNSW/IVFFlat cosine on `vector` columns, GIN on `fts` and tag arrays. (At ~1,500 users exact scan already gives perfect recall; indexes are speed, not correctness.)

## 10. Build phasing (for the implementation plan to slice)

1. **Phase 0 — Matching engine foundation.** Schema + RLS (per §9, including the identity columns, `squad_members` policy rewrite, and deny-all on the three matching tables), the identity-resolution helper with JIT students-row provisioning, the `embed` Supabase Edge Function (eng D2: one owner of model/dims/key/fallback; both repos call it), and the two RPCs. Backfill embeddings for existing posts/profiles. Pure backend; testable in isolation.
2. **Phase 1 — "For you" web board + cold-start capture.** Rank `/squad` for signed-in users + reason lines, **and** the D6 cold-start work (eng review moved it here from "unphased"): the onboarding "pick a few interests" step + major/year/behavior seeding — Phase 1's personalization is only real if the data lands with it. Posting stays on the (existing) form in this phase; the george-drafted "describe it" box moves to Phase 2 where its dependency lives.
3. **Phase 2 — george push loop + "describe it" box.** **Prerequisite (eng D8): george deployed to stable cloud infra** — no laptop/quick-tunnel on the critical path. (Newly cheap: the merged Spectrum migration removed the Mac-for-iMessage dependency; george runs containerized with `TRANSPORT=spectrum`.) Then: draft → approve → ping over iMessage and web chat; the web form's george **prefill assist** (design D6) via the same draft endpoint; `squad_pings` + pre-fusion gate + cap enforcement; join + intro. Pings are **iMessage-only this phase** (eng D3): the web opt-in toggle tells unlinked users to link george; undeliverable pings are recorded `suppressed_no_channel`, never silently dropped. Web users get their ping inbox in Phase 3.
4. **Phase 3 — "Your Activity" hub + receiving controls.** Profile streams (Your 局s / Joined / Pings), "what we match you on", `user_match_prefs` (including the opt-in ping toggle from D5).
5. **Phase 4 — Coordination / follow-through (CEO review D3, accepted).** After a 局 forms, george confirms time/place, sends reminders, handles a drop-out (re-open the spot + re-ping), and marks it completed. Sequenced after the push loop proves out; reuses the heartbeat/proactive layer. This attacks the real conversion failure (asks fizzle *after* the yes), so it only pays off once matching gets the yes.

Cross-feature hub generalization (Events/集运 streams) is explicitly **out of scope** here; the Phase 3 structure is designed to accept them later.

## 11. Error handling

- **Embedding failure** (model/API down): fall back to tag-overlap + keyword legs only (still functional); retry embed async; never block a post from being created.
- **No matches above threshold:** the post still lives on the board; zero pings is a valid, expected outcome, not an error.
- **Capacity race on join:** already handled by the existing `fn_update_squad_current_people` trigger (`squad_full` exception); surface a friendly "这个局满了" and refresh.
- **Cap/quiet-hours hit:** the ping is suppressed (or queued past quiet hours), logged in `squad_pings` as not-sent, never silently dropped without a record.

## 11.5 Observability (added via CEO review)

A matching/ping system flies blind without metrics. Instrument from day one:
- **Ping funnel:** sent → responded (joined / declined / no-response-after-72h), per category. (eng review: iMessage exposes no delivered/opened receipts, so the funnel only contains what we can measure; suppressed pings are tracked by their `squad_pings.status`.)
- **Mute rate** and **opt-in rate** — the canary for spam. If mute rate climbs, tighten threshold/cap.
- **Match-score distribution** per ping and per board impression (are we pinging on strong or weak matches?).
- **局 outcomes:** created → filled → (Phase 4) actually-happened, plus time-to-fill.
- **Embedding pipeline:** embed success/failure rate, latency, and fallback-to-tag-only count.

These metrics drive the threshold / cap / RRF-weight tuning that §13 defers to early data.

## 11.6 UI design specs (plan-design-review, 2026-06-12)

### Interaction state table (what the user SEES)

| Surface | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|---|---|---|---|---|---|
| Board 为你推荐 | `SkeletonCard` ×3 in the ranked slots | "还没有匹配你的局 — 先去逛逛全部，或者发一个？" + `发布找搭子` CTA | rail+grid fall back to newest-first with a quiet "推荐暂时不可用" tag (never a broken page) | ranked cards with ✦ reason chips | <3 strong matches: show what clears the floor, fill the rest newest-first (no fake reasons) |
| Board grid | existing skeleton grid | existing EMPTY ghost-text treatment + post CTA (keep) | "LOAD FAILED — RETRY" (keep) | grid | filters with 0 hits: "这个分类还没有局" + offer to clear filters |
| Hub 我的局/已加入 | skeleton rows | "还没组过局。第一个最好玩 😋" + post CTA / "还没加入过局 — 去看看为你推荐?" + board link | inline retry row | streams with status tags | a 局 cancelled by organizer shows 已取消 tag, never silently vanishes |
| Hub PINGS | skeleton rows | "暂时没有新邀请。开着提醒，有对的局 george 喊你" (if opt-in ON) / opt-in pitch (if OFF) | inline retry | ping cards with ✦ reason + 通过/拒绝 | responded pings collapse to a one-line history row |
| Form prefill (D6) | button shows "george 在帮你填…" ≤8s | — | box hides with "george 走神了，手动填吧 🥲"; form untouched | fields filled + highlighted for review | george fills what it parsed; missing fields keep placeholders |
| Join (modal/ping) | button disabled + spinner | — | `squad_full` → "这个局满了 🥲 看看别的?" + refresh | joined + intro message | — |

### Responsive (≤768px is the primary experience — most students are on phones)

- Board: filter rail collapses to the existing horizontal-scroll category chip row under the header; gender/sort behind one `筛选` chip. 为你推荐 numbered cards go full-width stacked (rank squares stay); grid becomes single column. `发布找搭子` becomes a fixed bottom-right brutal FAB.
- Hub: streams stack vertically, **PINGS first** (time-sensitive), then 我的局, then 已加入, each with a count badge; WHAT WE MATCH YOU ON stays at the bottom.
- Touch + a11y: 44px minimum targets on 通过/拒绝/toggle/FAB; ping toggle is `role="switch"` with `aria-checked`, space/enter operable; all cards keep the existing keyboard pattern (`SquadCard.tsx:30-38`). **Contrast rule: cardinal `#990000` on cream for text chips (passes 4.5:1); gold is background-only with black text, never text-on-cream.**

### george ping + intro scripts (voice-locked; prompts must follow these shapes)

Ping (≤2 bubbles, reason stated, zero pressure, opt-out honored):
> 「诶 周五晚有人组了韩烤局 K-town 3缺2」
> 「你之前说想吃韩烤 想去我帮你报名 不想去忽略我就行哈哈哈」

Accept → join + intro (george brokers, no raw contact dump until joined):
> 「包的 帮你进去了 现在3/5」
> 「组局的是 {poster_name}，联系方式 {contact}，到时候别鸽 🫡」

Decline / no response: silent (no follow-up nag; counts against nothing). Mute request in-thread: "收到 不打扰" + flips `pings_enabled` off.

Banned in ping copy: 广告腔 ("不要错过!"), >2 emoji, 🔥💯🎉, guilt ("大家都在等你"), and any reason chip we can't back with real data (no fake "你们都喜欢").

### Approved Mockups

| Screen | Mockup path | Direction | Constraints |
|---|---|---|---|
| 找搭子 board | `~/.gstack/projects/BIBOYANG425-bia-roommate/designs/squad-foryou-board-20260612/variant-C.png` (structure) + `variant-A.png` (rank blocks) | C's filter rail + CTA + 为你推荐 grid, A's numbered rank squares on top 3 | add gender-restriction tags; ✦ chips cardinal-on-cream |
| Your Activity hub | `~/.gstack/projects/BIBOYANG425-bia-roommate/designs/squad-activity-hub-20260612/variant-B.png` | B's 3 numbered streams + match strip + warm empties | DROP the left nav rail — render in ProductShell; connected-system treatment (§5.3) |

## 12. Testing strategy

- **Matching engine:** unit tests on the RPCs with seeded posts/users asserting rank order and threshold behavior; a small labeled fixture ("this user should rank for this post") to guard against regressions. Test the cold-start path (tags only, no embeddings) separately.
- **User-vector builder:** tests that the whitelist excludes sensitive blocks, that faceted max-similarity beats centroid on a multi-interest fixture, and that tag normalization collapses synonyms.
- **Push loop:** tests for draft extraction, the approval gate (nothing sends pre-approval), threshold + weekly-cap enforcement, and platonic/约会 exclusion.
- **Board:** ranked vs fallback ordering; signed-out path; zero-posts empty state.
- **Bilingual:** fixtures in both Chinese and English asserting cross-language matches (韩烤 ↔ korean bbq) to validate the multilingual model choice.
- **Invariant tests (eng review D5 — the promises the decisions created, all REQUIRED):**
  1. **Consent invariant:** a student with `pings_enabled=false` (the default) is NEVER selected for a ping, regardless of match score.
  2. **Cap + quiet-hours enforcement:** the (cap+1)th ping in a week and any ping during quiet hours are recorded as `suppressed_*`, not sent.
  3. **No-silent-drop:** an undeliverable ping (no george link) produces a `suppressed_no_channel` row, never a `sent` row and never nothing.
  4. **Reach privacy (CEO-D7):** the organizer-facing endpoint returns only an aggregate count; assert recipient identities/declines never appear in any organizer-readable payload.
  5. **RLS:** `squad_pings` / `user_match_prefs` / `user_interest_vectors` are unreadable cross-user with anon and authenticated keys.
  6. **Identity resolver:** auth-uuid / phone-handle / students.id round-trips, plus JIT students-row creation for a web-auth user with no row.
  7. **Embed fallback:** Edge Function failure → post still created, ranking falls back to tag+keyword legs, retry queued (§11).
  8. **Derived status view:** `cancelled_at`/counter/deadline combinations map to closed/full/expired/open correctly at boundaries.
  9. **Join race (E2E):** concurrent joins on the last slot — exactly one succeeds, the trigger's `squad_full` surfaces as the friendly error, count stays consistent.

## 13. Open questions (to settle during planning)

- Default RRF weights (tag / keyword / semantic) for a tiny community where early posts have few interactions.
- Exact similarity threshold and default weekly ping cap (tune from early data).
- Whether facets are LLM-clustered from prose or derived per `interests[]` entry.
- Channel for pinging non-iMessage users in Phase 2 (web-inbox vs email) before WeChat exists.
- Whether the web board keeps 约会 at all, given george excludes it (product call).
- **Deferred (CEO review D4):** WeChat group-chat capture (detect "有人去X吗" in the BIA groups and offer to matchmake) is logged for a later phase, after the 1:1/web loop proves out and WeChat plumbing exists. Highest reach unlock, heaviest integration + consent + false-positive surface.
- **TODO (design review D8):** run `/design-consultation` to capture the brutalist system as `DESIGN.md` — tokens (the 20 vars in `app/globals.css`: cream/black/cardinal/gold/mid), `brutal-*` component classes, display type, do/don'ts. Today it exists only as code convention; every design review reverse-engineers it. Not Squad-blocking.
- Embedding latency and cost are acceptable at our volume, but the embedding step must be a **shared service both doors call** (web post API + george), not duplicated per surface.

## 14. Cross-repo coordination

- Schema migrations → `bia-admin/supabase/migrations` first, then consumers.
- `/squad` API + board → `bia-roommate`.
- Push loop + memory/embedding refresh → `george`.
- Embedding model API key (if OpenAI) → new env var in `george` and any embedding caller; document in `.env.example`.

## 15. CEO review decisions (plan-ceo-review, 2026-06-12, mode: selective expansion)

| # | Decision | Choice |
|---|---|---|
| D1 | Build approach | Full spec, phased (now 5 phases incl. coordination) |
| D2 | Review mode | Selective expansion |
| D3 | Coordination / follow-through | **Accepted** as Phase 4 |
| D4 | WeChat group-chat capture | **Deferred** (later phase) |
| D5 | Ping consent default | **Pure opt-in** (settings only, off by default) |
| D6 | Cold-start interest data | **Onboarding capture + seed** from major/year/behavior |
| D7 | Match-graph privacy | Organizer sees **aggregate reach only**; recipient identities/declines private |

Hardening folded into the spec: Observability section (§11.5), embedding as a shared service both doors call (§13), cold-start seeding (§7.6).

### NOT in scope
- WeChat group-chat capture (deferred, D4).
- Romantic / 约会 matching (george platonic-only).
- Full cross-feature activity hub for non-Squad features (designed-for, not wired).
- Collaborative-filtering recommenders (content-based only).

## 16. Eng review decisions (plan-eng-review, 2026-06-12)

| # | Finding | Decision |
|---|---|---|
| E1 | Identity split across auth.users / students / phone handles; squad FKs block george writes | **students.id everywhere**; resolver helper + JIT provisioning; ALTERs on squad tables (§9) |
| E2 | "Shared embedding service" had no home | **Supabase Edge Function `embed`** — one owner of model/dims/key/fallback |
| E3 | Phase-2 ping channel unresolved; opted-in web users undeliverable | **iMessage-only Phase 2**; `suppressed_no_channel` recorded; settings UI says "link george" |
| E4 | Stored `status` column duplicates derivable state | **Derive open/full/expired in a view; store only `cancelled_at`** |
| E5 | Test plan missed the invariants the decisions created | **9 invariant tests added** (§12) |
| E6 | Outside voice (cold-read subagent; Codex CLI outdated): 7 verified defects | **All adopted**: pre-fusion gate (§6.3), RLS rewrite + deny-all design (§9), cold-start phasing (§10), bia-admin owns all new DDL (§9), state-block extractor mechanism (§7.1), users-direction RPC simplification (§6.2), measurable ping funnel (§11.5) |
| E7 | george on a laptop/quick-tunnel is the push loop's critical path | **Cloud-hosting george is a Phase-2 prerequisite** (Spectrum migration already removed the Mac dependency) |

**Recorded cross-model tensions (not re-asked — tied to decisions already made):** the outside voice re-argued "thin loop first / supply problem before ranking engine" (= CEO-D1, decided: full build) and questioned the web "describe it" box's friction thesis (noted for `/plan-design-review`).

### What already exists (reused, not rebuilt)
`squad_posts`/`squad_members` + atomic capacity trigger; `/squad` board on ProductShell; `/george/chat`; george memory/heartbeat layer; pgvector (enabled, cosine-indexed); Slice B onboarding form (gains the interest step); the Spectrum transport (enables E7's prerequisite).

### Failure modes (critical-path registry)
| Codepath | Failure | Handled | Tested |
|---|---|---|---|
| embed Edge Fn | model/API down | fallback to tag+keyword legs, async retry (§11) | test 7 |
| ping selection | non-opted-in user matched | consent gate excludes pre-send | test 1 |
| ping delivery | no channel for recipient | `suppressed_no_channel` row | test 3 |
| join | capacity race on last slot | trigger `squad_full` → friendly error | test 9 |
| organizer reach view | identity leak | aggregate-count-only endpoint + deny-all RLS | tests 4, 5 |
| george outage | push loop down | Phase-2 prerequisite: cloud hosting (E7) | deploy gate |

### Parallelization (for the implementation plan)
Lane A: Phase 0 engine+schema (bia-admin migrations + Edge Fn + RPCs) → Lane B: Phase 1 board (bia-roommate, depends on A) ∥ Lane C: george draft/ping code (george repo, depends on A, ships in Phase 2). B and C touch different repos — parallel-safe after A merges. Phase 3-4 sequential after B+C.

## 17. Design review decisions (plan-design-review, 2026-06-12)

| # | Decision | Choice |
|---|---|---|
| G1 | Review breadth | Full breadth (all surfaces incl. settings/banners) |
| G2/G3 | Board direction (mockups: A=4★ B=3★ C=4★, tie) | **C's structure + A's numbered ranks** + gender-restriction tags |
| G4/G5 | Hub direction (B=4★) + "more connected" | **B without its left nav** — ProductShell + connected-system treatment (shared rank squares, one ✦ chip component, cross-links) |
| G6 | Web posting flow (the eng outside-voice tension) | **Form leads, george prefills** — revises the describe-box-primary decision; posting never blocked on george |
| G7 | Completeness | State table + responsive/a11y spec + voice-locked ping/intro scripts added (§11.6) |
| G8 | DESIGN.md gap | TODO'd in §13 (run /design-consultation later) |

Pass scores: Info Arch 4→9 · States 3→9 · Journey 5→9 · AI Slop 8 (mockups passed vision gate) · Design System 6→7 (TODO'd) · Responsive/a11y 3→9 · Decisions: 6 resolved, 0 deferred. **Overall: 4/10 → 9/10.**

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 2 expansions (1 accepted, 1 deferred), 3 hardening decisions, 0 unresolved |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 12 issues (5 review + 7 outside-voice), all resolved; 9 invariant tests added; 0 critical gaps open |
| Outside Voice | adversarial subagent (Codex CLI outdated) | Independent 2nd opinion | 1 | issues_found → adopted | 7 verified defects adopted; 2 tensions recorded (1 since resolved by design G6) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score 4/10 → 9/10; 6 mockups (2 approved directions); 6 decisions; state/responsive/voice specs added |

- **CROSS-MODEL:** outside voice independently re-derived the eng identity finding (E1, agreement) and challenged the describe-box web flow — **resolved by design G6** (form leads, george prefills); the thin-loop-first tension remains recorded against CEO-D1 (user decided full build).
- **UNRESOLVED:** 0 across all three reviews. Remaining knobs (RRF weights, floors, weekly cap, facet clustering, 约会 keep/drop) are data-tuning items per §13.
- **VERDICT:** CEO + ENG + DESIGN CLEARED — ready for the implementation plan (writing-plans), then build Phase 0.
