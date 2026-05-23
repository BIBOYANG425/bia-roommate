# Instagram APIFY Event Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the merged design spec (`docs/plans/2026-04-22-instagram-scraper-design.md`) into a running scraper that pulls USC student-org Instagram posts weekly, validates them via LLM + pure rules, and inserts `status='active'` rows into the existing `events` table.

**Architecture:** A weekly cron fires `scrapeInstagram()` in `george/src/scrapers/instagram.ts`. It calls the `apify/instagram-scraper` actor with a hard-coded ~25-handle list (`IG_ACCOUNTS` in a sibling module), dedups on `source_url`, runs each post through `callLightweightLLM` (JSON mode), validates the LLM output with a pure `validatePost` function, and inserts into Supabase. Graceful degrade if `APIFY_TOKEN` is unset. No moderation, no catchup, no dynamic account list.

**Tech Stack:** TypeScript + Node (ESM), Vitest, `apify-client` (new dep), Supabase JS client, `node-cron`, existing `callLightweightLLM` helper, existing Supabase singleton.

---

## Eng review amendment (2026-05-03)

`/plan-eng-review` surfaced six findings that require plan edits. They supersede the
original task bodies where they conflict; tasks below have been updated in-place
where straightforward, otherwise read this section as authoritative.

### Finding A + C + D (combined): cron time, timezone, matcher-call seam

The CEO review's matcher-call fix (Finding #1) was added inside `scrapeInstagram`,
but `proactive.ts` has a quiet-hours guard `hour >= 22 || hour < 8` (server local).
With cron at `0 0 * * 1`, server local hour is 0 → quiet hours → matcher returns
without doing anything. The fix is null. Compounding: `node-cron` here is invoked
without a timezone option, so "server local" depends on the host's `TZ` env (not
pinned in this repo).

Three corrections (all in `george/src/index.ts`, not `scrapers/instagram.ts`):
1. Move the cron expression to an active hour: `0 12 * * 1` with explicit
   `{ timezone: 'America/Los_Angeles' }` (Mon 12:00 PT, lunchtime).
2. Move the `await matchStudentsToEvents()` call **out of `scrapeInstagram`** and
   into the cron handler in `index.ts`, so the scraper module stops importing
   `jobs/proactive.ts`. Keeps `scrapers/` as pure data-pull, decouples from `jobs/`.
   Also means the admin endpoint `/admin/scrape-instagram` does NOT trigger pushes
   (correct — admin scrapes are smoke tests, shouldn't blast students).
3. Drop the `matchStudentsToEvents` import + post-scrape call from
   `scrapers/instagram.ts` (revert that piece of the CEO amendment) AND drop the
   proactive mock + matcher assertions from `tests/scrapers/instagram.test.ts`.

Net effect on Tasks: Task 4 simpler (no proactive mock, no matcher import);
Task 8 grows (cron change + timezone + matcher call all in the cron handler).

### Finding B: dedup is racy without a UNIQUE index

`supabase/migrations/` does not contain the `events` table create statement
(it lives in prod but isn't checked into this repo). We can't tell whether
`source_url` has a UNIQUE index. Without one, two concurrent scrapes (cron +
admin endpoint) can both miss-then-insert and produce duplicate rows.

**New Task 1.5**: write a migration
`supabase/migrations/{date}_events_source_url_unique.sql` with:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS events_source_url_unique
  ON public.events (source_url)
  WHERE source_url IS NOT NULL;
```

Partial index (`WHERE source_url IS NOT NULL`) is intentional: USC events feed
sometimes has null source_url, and we don't want to break those. Also amend
Task 4 insert path to check `result.error` and log a warn (skipping unique-
violation `23505`, which is the expected race resolution).

### Finding F + Bob's PII request: validatePost hardening

Task 3 amendments:
- Use `title.trim().length` for the length check (5 spaces should not pass).
- Add a new helper `stripContactInfo(description: string | null): string | null`
  in `instagram-validate.ts` that strips phone numbers, Venmo handles, and email
  addresses from the description. This is `fix/geo-rate-limit-and-ig-spec`'s
  Risks-accepted item #3 (open branch by Bob, not yet merged); the design-spec
  amendment lives at HEAD of that branch and explicitly asks the implementer to
  add this two-line regex sweep.
- `validatePost` calls `stripContactInfo` on the description before returning
  the validated event.

Three regexes, applied in order, each replaces match with `[contact removed]`:
- Phone: `/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g`
- Venmo: `/\b(?:venmo|@venmo)\s*[:@]?\s*[\w-]+/gi`
- Email: `/\b[\w.-]+@[\w-]+\.[\w.-]+\b/g`

Add 4 unit tests (one per regex + one combined).

### Finding H: 4 more integration test cases

Add to `tests/scrapers/instagram.test.ts` (extend Task 7 — graceful-degrade test
file already exists by then):
1. APIFY actor `call()` rejects → log `instagram_unavailable` warn, no insert.
2. Supabase `insert` returns `{ error: { code: '23505' } }` (unique violation) →
   silent skip (expected race resolution), no warn.
3. Supabase `insert` returns `{ error: { code: '99999' } }` (unexpected) →
   log warn `instagram_insert_failed`.
4. Post with no `url` field → dedup query skipped, LLM still called, insert
   still attempted (source_url is null in row).

### Finding E: deployment platform — STILL pending Bob

Vercel-style hosts will time out the admin endpoint when scrape takes 30s-3min.
Fly/Railway/VM are fine. Bob hasn't said. Plan keeps the synchronous admin
handler. If Bob says Vercel later, follow-up commit converts to 202+background.
Tracked as a TODO in the smoke-test runbook (Task 9).

### Wedge question (CEO Finding #2): STILL pending Bob

Plan still ships thin slice (Troy Labs + SEP, `frats: []`). When Bob's WeChat
reply arrives, a tiny follow-up commit fills `frats: [...]` with the chosen list.

---

## CEO review amendment (2026-04-25)

`/plan-ceo-review` surfaced two changes from the original plan:

1. **Finding #1 (CRITICAL — fixed in this plan)**: `proactive.ts` only matches events with `created_at >= now - 6h` and runs every 3h. Weekly IG cron means events are visible to the matcher for ~6 hours per week. **Fix**: at the end of `scrapeInstagram`, if any events were inserted, fire `matchStudentsToEvents()` directly so the fresh batch gets one push window before the 6h gate closes. Wired in Task 4. No new task; ~5 lines impl + ~10 lines test.

2. **Finding #2 (HIGH — pending Bob's WeChat reply)**: Frat IG accounts are likely the wrong wedge for the international-student user base; cultural orgs (CSSA / KSA / JSA / etc.) and pre-pro clubs (Marshall consulting / finance / pre-med) over-index on relevance. Cyrus is asking Bob to revise the account list. Until Bob replies, **Task 2 ships only Troy Labs + SEP (2 accounts) as a thin slice**. The frat list in `ig-accounts.ts` stays empty `frats: []`. When Bob's reply arrives, a separate small commit fills in either revised cultural-org accounts or the original frat list — no rewrite of Task 2 needed.

Findings #3 (caption-only LLM extraction) and #4 (direct publish risk) are deferred to TODOs after 4 weeks of real LLM accuracy data.

---

## Workspace

- Worktree: `/Users/cyrusgu/Desktop/bia-worktrees/instagram-scraper-impl`
- Branch: `feat/instagram-scraper-impl` (off `main @ 3c8ada2`)
- **All commands below assume `cd /Users/cyrusgu/Desktop/bia-worktrees/instagram-scraper-impl`** as the starting directory.

## Test + typecheck command reference

Vitest (all george tests):
```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

Vitest (single file):
```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run <path>
```

Typecheck:
```bash
cd george && npx tsc --noEmit
```

**Invariant:** every commit must leave both `tsc --noEmit` and `vitest run` green (modulo the one known pre-existing skill-flow failure that has been around since before PR #30 — if you see any *new* failure, stop and diagnose).

## File structure (plan of record)

Files created by this plan:

| Path | Responsibility |
|---|---|
| `george/src/scrapers/ig-accounts.ts` | Hard-coded `IG_ACCOUNTS = { frats, troyLabs, sep }` + `flattenHandles()` helper. |
| `george/src/scrapers/instagram-validate.ts` | Pure `validatePost(input: unknown)` function implementing the 5-rule validation. Plus a `CATEGORIES` whitelist. |
| `george/tests/scrapers/ig-accounts.test.ts` | Unit tests for the account list shape + flatten. |
| `george/tests/scrapers/instagram-validate.test.ts` | Unit tests for `validatePost` (happy path + rejects + coerce + null guard). |
| `george/tests/scrapers/instagram.test.ts` | Integration test for `scrapeInstagram`: mocks apify + LLM + supabase. |
| `docs/plans/2026-04-22-instagram-scraper-smoke-runbook.md` | One-page runbook for Bob to run the real-key smoke test once `APIFY_TOKEN` is set. |

Files modified:

| Path | Change |
|---|---|
| `george/package.json` | Add `apify-client` to `dependencies`. |
| `george/package-lock.json` | Auto-updated by `npm install`. |
| `george/.env.example` | Document `APIFY_TOKEN=`. |
| `george/src/scrapers/instagram.ts` | Full rewrite: use static `apify-client` import, new actor, `resultsLimit=3`, dedup, validatePost, structured log counters, graceful degrade. |
| `george/src/index.ts` | Change cron `0 */4 * * *` → `0 0 * * 1`. |

## Task ordering rationale

Tasks are ordered so that every intermediate commit keeps `tsc` + `vitest` green. In particular: `validatePost` and `IG_ACCOUNTS` are introduced in their own files first (nothing else imports them yet). Only once those are in place do we rewrite `instagram.ts` to consume them. The cron change is last-but-one because it doesn't affect tests and is safe to touch after the rewrite has its own integration coverage.

---

### Task 1: Add `apify-client` dependency + document `APIFY_TOKEN` + unblock tsc

**Files:**
- Modify: `george/package.json`
- Modify: `george/package-lock.json` (auto)
- Modify: `george/.env.example`
- Modify: `george/src/scrapers/instagram.ts:43` (remove now-stale `@ts-expect-error`)

- [ ] **Step 1: Add `apify-client` to dependencies**

Edit `george/package.json` and add `"apify-client": "^2.14.1"` to the `dependencies` block (keep alphabetical with the existing entries). The `dependencies` block should become:

```json
"dependencies": {
    "@anthropic-ai/sdk": "^0.88.0",
    "@photon-ai/imessage-kit": "^2.1.2",
    "@supabase/supabase-js": "^2.103.0",
    "apify-client": "^2.14.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "js-yaml": "^4.1.1",
    "lru-cache": "^11.3.5",
    "node-cron": "^4.2.1",
    "xml2js": "^0.6.2"
},
```

If 2.14.1 is not available at install time, pin to the latest 2.x that `npm install` resolves.

- [ ] **Step 2: Install to regenerate the lockfile**

```bash
cd george && npm install
```

Expected: `npm install` succeeds, `package-lock.json` now contains `apify-client` and its transitive deps.

- [ ] **Step 3a: Remove the now-stale `@ts-expect-error` in the old `instagram.ts`**

The old placeholder at `george/src/scrapers/instagram.ts:43` has:

```ts
    // @ts-expect-error — package not installed; runtime-only dependency
    const { ApifyClient } = await import('apify-client')
```

Now that `apify-client` is installed, TypeScript reports TS2578 "Unused '@ts-expect-error' directive" for this line. Delete just the `// @ts-expect-error ...` comment line. The dynamic `import('apify-client')` call is left in place — Task 4 replaces the whole file anyway, but between Task 1 and Task 4, the old runtime path must keep compiling.

- [ ] **Step 3b: Document `APIFY_TOKEN` in `.env.example`**

Read `george/.env.example`. If it does not already contain a line for `APIFY_TOKEN`, append a commented block:

```
# APIFY_TOKEN — enables the weekly Instagram event scraper (apify/instagram-scraper).
# When unset, the scraper logs 'instagram_unavailable' and returns without erroring.
# Get one at https://console.apify.com/account/integrations
APIFY_TOKEN=
```

If the file already has an `APIFY_TOKEN=` line from an earlier placeholder, leave it and add the two-line comment above it.

- [ ] **Step 4: Verify typecheck + tests still pass**

(Steps 3a and 3b above both need to be committed together in this task — neither alone leaves tsc green on strict settings.)

```bash
cd george && npx tsc --noEmit
```

Expected: clean (no new output).

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

Expected: same pass count as before this task (one pre-existing skill-flow failure is OK; any new failure is a bug).

- [ ] **Step 5: Commit**

```bash
git add george/package.json george/package-lock.json george/.env.example george/src/scrapers/instagram.ts
git commit -m "chore(instagram): add apify-client dep + document APIFY_TOKEN + unblock tsc"
```

---

### Task 2: Hard-coded account list (`ig-accounts.ts`) — thin slice

**Files:**
- Create: `george/src/scrapers/ig-accounts.ts`
- Create: `george/tests/scrapers/ig-accounts.test.ts`

**Important — read the CEO review amendment above before starting.** This task ships only Troy Labs + SEP. The `frats: []` group is intentionally empty pending Bob's reply on the wedge question. A follow-up commit (after Bob's WeChat reply) fills in either the revised cultural-org accounts or the original frat list.

- [ ] **Step 1: Write the failing test**

Create `george/tests/scrapers/ig-accounts.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { IG_ACCOUNTS, flattenHandles } from '../../src/scrapers/ig-accounts.js'

describe('IG_ACCOUNTS', () => {
  it('exposes three groups: frats, troyLabs, sep', () => {
    expect(Object.keys(IG_ACCOUNTS).sort()).toEqual(['frats', 'sep', 'troyLabs'])
  })

  it('every handle is a non-empty lowercase string with no @ prefix', () => {
    const all = flattenHandles()
    expect(all.length).toBeGreaterThan(0)
    for (const h of all) {
      expect(h).toMatch(/^[a-z0-9._]+$/)
      expect(h.startsWith('@')).toBe(false)
    }
  })

  it('no duplicate handles across groups', () => {
    const all = flattenHandles()
    expect(new Set(all).size).toBe(all.length)
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/ig-accounts.test.ts
```

Expected: FAIL with "Cannot find module '../../src/scrapers/ig-accounts.js'".

- [ ] **Step 3: Write minimal implementation**

Create `george/src/scrapers/ig-accounts.ts`:

```ts
// Hard-coded USC student org Instagram handles that the weekly scraper pulls.
// Adding/removing a handle is intentionally a code change — see the design
// spec's "Non goals" section for why.
//
// Currently a thin slice: only Troy Labs + SEP. The frats group is intentionally
// empty pending Bob's WeChat reply on the wedge question (see CEO review
// amendment at the top of this plan, 2026-04-25). A small follow-up commit
// fills in the revised cultural-org or frat handles once Bob confirms.
//
// Header last reviewed: 2026-04-25

export const IG_ACCOUNTS = {
  // PENDING Bob's wedge confirmation. Either reverts to the 20-frat IFC list
  // or gets replaced with cultural-org / pre-pro accounts (CSSA, KSA, etc.).
  frats: [] as string[],
  // Troy Labs — USC's student-run venture studio.
  troyLabs: ['troylabsusc'],
  // SEP — Spark SC / Student Entrepreneur Program.
  sep: ['sparksc'],
} as const

export function flattenHandles(): string[] {
  return [
    ...IG_ACCOUNTS.frats,
    ...IG_ACCOUNTS.troyLabs,
    ...IG_ACCOUNTS.sep,
  ]
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/ig-accounts.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Verify full suite still green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add george/src/scrapers/ig-accounts.ts george/tests/scrapers/ig-accounts.test.ts
git commit -m "feat(instagram): hard-coded IG_ACCOUNTS (frats + Troy Labs + SEP)"
```

---

### Task 3: `validatePost` pure function

**Files:**
- Create: `george/src/scrapers/instagram-validate.ts`
- Create: `george/tests/scrapers/instagram-validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `george/tests/scrapers/instagram-validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validatePost, CATEGORIES } from '../../src/scrapers/instagram-validate.js'

// Use a stable "now" anchor in the tests by computing offsets from Date.now().
function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

describe('validatePost', () => {
  describe('happy paths', () => {
    for (const category of CATEGORIES) {
      it(`accepts a valid ${category} event`, () => {
        const result = validatePost({
          isEvent: true,
          title: `Demo ${category} event`,
          description: 'desc',
          date: daysFromNow(7),
          location: 'Campus',
          category,
        })
        expect(result.valid).toBe(true)
        if (result.valid) {
          expect(result.event.title).toBe(`Demo ${category} event`)
          expect(result.event.category).toBe(category)
        }
      })
    }
  })

  describe('rejects', () => {
    const base = {
      isEvent: true,
      title: 'Valid title',
      description: 'd',
      date: daysFromNow(7),
      location: 'Campus',
      category: 'social',
    }

    it('rejects isEvent=false', () => {
      const r = validatePost({ ...base, isEvent: false })
      expect(r).toEqual({ valid: false, reason: 'not_event' })
    })

    it('rejects title shorter than 5 chars', () => {
      const r = validatePost({ ...base, title: 'abc' })
      expect(r).toEqual({ valid: false, reason: 'title_length' })
    })

    it('rejects title longer than 120 chars', () => {
      const r = validatePost({ ...base, title: 'x'.repeat(121) })
      expect(r).toEqual({ valid: false, reason: 'title_length' })
    })

    it('rejects null date', () => {
      const r = validatePost({ ...base, date: null })
      expect(r).toEqual({ valid: false, reason: 'date_invalid' })
    })

    it('rejects unparseable date string', () => {
      const r = validatePost({ ...base, date: 'not-a-date' })
      expect(r).toEqual({ valid: false, reason: 'date_invalid' })
    })

    it('rejects date in the past', () => {
      const r = validatePost({ ...base, date: daysFromNow(-1) })
      expect(r).toEqual({ valid: false, reason: 'date_out_of_window' })
    })

    it('rejects date more than 180 days out', () => {
      const r = validatePost({ ...base, date: daysFromNow(181) })
      expect(r).toEqual({ valid: false, reason: 'date_out_of_window' })
    })
  })

  describe('coercions (not rejects)', () => {
    it("coerces unknown category to 'other'", () => {
      const r = validatePost({
        isEvent: true,
        title: 'Valid title',
        date: daysFromNow(7),
        category: 'wildcategory',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.category).toBe('other')
    })

    it("treats missing category as 'other'", () => {
      const r = validatePost({
        isEvent: true,
        title: 'Valid title',
        date: daysFromNow(7),
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.category).toBe('other')
    })
  })

  describe('null-guard', () => {
    it('rejects null', () => {
      expect(validatePost(null)).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects undefined', () => {
      expect(validatePost(undefined)).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects a string', () => {
      expect(validatePost('nope')).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects a number', () => {
      expect(validatePost(42)).toEqual({ valid: false, reason: 'not_object' })
    })
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram-validate.test.ts
```

Expected: FAIL with "Cannot find module '../../src/scrapers/instagram-validate.js'".

- [ ] **Step 3: Write minimal implementation**

Create `george/src/scrapers/instagram-validate.ts`:

```ts
// Pure validation of the lightweight-LLM output shape before it reaches the
// events table. Five rules: isEvent=true / title length 5-120 / date parses
// and is within [now, now+180 days] / category coerced to whitelist / input
// must be a non-null object. See the design spec's "Validation rules" section.
//
// Header last reviewed: 2026-04-22

export const CATEGORIES = ['social', 'academic', 'career', 'cultural', 'sports', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

const TITLE_MIN = 5
const TITLE_MAX = 120
const FUTURE_WINDOW_DAYS = 180
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ValidEvent {
  title: string
  description: string | null
  date: string // ISO
  location: string | null
  category: Category
}

export type ValidationResult =
  | { valid: true; event: ValidEvent }
  | { valid: false; reason: 'not_object' | 'not_event' | 'title_length' | 'date_invalid' | 'date_out_of_window' }

function coerceCategory(raw: unknown): Category {
  if (typeof raw !== 'string') return 'other'
  return (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : 'other'
}

function coerceString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function validatePost(input: unknown): ValidationResult {
  if (input === null || typeof input !== 'object') {
    return { valid: false, reason: 'not_object' }
  }
  const obj = input as Record<string, unknown>

  if (obj.isEvent !== true) {
    return { valid: false, reason: 'not_event' }
  }

  const title = obj.title
  if (typeof title !== 'string' || title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { valid: false, reason: 'title_length' }
  }

  if (typeof obj.date !== 'string') {
    return { valid: false, reason: 'date_invalid' }
  }
  const parsed = new Date(obj.date)
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, reason: 'date_invalid' }
  }

  const now = Date.now()
  const windowEnd = now + FUTURE_WINDOW_DAYS * MS_PER_DAY
  const ts = parsed.getTime()
  if (ts < now || ts > windowEnd) {
    return { valid: false, reason: 'date_out_of_window' }
  }

  return {
    valid: true,
    event: {
      title,
      description: coerceString(obj.description),
      date: parsed.toISOString(),
      location: coerceString(obj.location),
      category: coerceCategory(obj.category),
    },
  }
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram-validate.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Verify full suite still green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add george/src/scrapers/instagram-validate.ts george/tests/scrapers/instagram-validate.test.ts
git commit -m "feat(instagram): validatePost — isEvent + title length + date window + category whitelist"
```

---

### Task 4: Rewrite `scrapeInstagram` — happy path + post-scrape matcher trigger

**Files:**
- Modify: `george/src/scrapers/instagram.ts` (full rewrite)
- Modify: `george/src/index.ts:99-107` (drop stale `accounts` arg from admin endpoint)
- Create: `george/tests/scrapers/instagram.test.ts`

Because the rewrite drops `scrapeInstagram`'s `accounts?: string[]` parameter (the new version always uses the hard-coded list), the admin endpoint at `george/src/index.ts:99-107` must be updated in the **same commit** or tsc breaks between commits. That endpoint becomes:

```ts
app.post('/admin/scrape-instagram', adminAuth, async (_req, res) => {
  try {
    await scrapeInstagram()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
```

The cron caller at `george/src/index.ts:134-138` already invokes `scrapeInstagram()` with no args, so that block stays unchanged in this task.

- [ ] **Step 1: Write the failing integration test — happy path**

Create `george/tests/scrapers/instagram.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock apify-client
const actorCallMock = vi.fn()
const datasetListItemsMock = vi.fn()
vi.mock('apify-client', () => ({
  ApifyClient: vi.fn().mockImplementation(() => ({
    actor: vi.fn(() => ({ call: actorCallMock })),
    dataset: vi.fn(() => ({ listItems: datasetListItemsMock })),
  })),
}))

// Mock the lightweight LLM
const llmMock = vi.fn()
vi.mock('../../src/agent/llm-providers.js', () => ({
  callLightweightLLM: llmMock,
}))

// Mock the proactive matcher (CEO review Finding #1: scrape now triggers it directly)
const matchStudentsMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../../src/jobs/proactive.js', () => ({
  matchStudentsToEvents: matchStudentsMock,
}))

// Mock supabase
const maybeSingleMock = vi.fn()
const insertMock = vi.fn()
vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: insertMock,
    })),
  },
}))

// Mock the logger so we can assert on the done-line counters
const logMock = vi.fn()
vi.mock('../../src/observability/logger.js', () => ({
  log: logMock,
}))

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  actorCallMock.mockReset()
  datasetListItemsMock.mockReset()
  llmMock.mockReset()
  maybeSingleMock.mockReset()
  insertMock.mockReset()
  logMock.mockReset()
  matchStudentsMock.mockClear()
  // Default: APIFY_TOKEN is set, nothing is pre-existing
  process.env.APIFY_TOKEN = 'test-apify-token'
  maybeSingleMock.mockResolvedValue({ data: null })
  insertMock.mockResolvedValue({ error: null })
  actorCallMock.mockResolvedValue({ defaultDatasetId: 'ds-1' })
})

describe('scrapeInstagram — happy path', () => {
  it('inserts one event row per valid post, skips invalid, uses resultsLimit=3', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Come to our formal!', displayUrl: 'https://cdn/1.jpg', url: 'https://ig/p/1', ownerUsername: 'uscphidelt' },
        { caption: 'just a cute dog pic', displayUrl: 'https://cdn/2.jpg', url: 'https://ig/p/2', ownerUsername: 'uscphidelt' },
      ],
    })

    llmMock
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Phi Delt Spring Formal',
        description: 'Come to our formal!',
        date: daysFromNow(14),
        location: 'Beverly Hills',
        category: 'social',
      }))
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: false,
        title: '',
        date: null,
        category: 'other',
      }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    // apify call was made with the right actor + resultsLimit
    expect(actorCallMock).toHaveBeenCalledTimes(1)
    // Check the call was against the correct actor ID by inspecting how ApifyClient.actor was invoked
    // (we assert resultsLimit=3 via the input object passed to call())
    const callArg = actorCallMock.mock.calls[0][0]
    expect(callArg.resultsLimit).toBe(3)
    expect(Array.isArray(callArg.username)).toBe(true)
    expect(callArg.username.length).toBeGreaterThan(0) // thin slice: troyLabs + sep until Bob's reply

    // One insert (the valid event), none for the cute-dog post
    expect(insertMock).toHaveBeenCalledTimes(1)
    const row = insertMock.mock.calls[0][0]
    expect(row).toMatchObject({
      title: 'Phi Delt Spring Formal',
      category: 'social',
      source: 'instagram',
      source_url: 'https://ig/p/1',
      source_account: 'uscphidelt',
      image_url: 'https://cdn/1.jpg',
      status: 'active',
    })

    // Post-scrape matcher fires once because at least one event was inserted
    expect(matchStudentsMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire the matcher when zero events are inserted', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'just a meme', displayUrl: 'https://cdn/x.jpg', url: 'https://ig/p/x', ownerUsername: 'sparksc' },
      ],
    })
    llmMock.mockResolvedValueOnce(JSON.stringify({ isEvent: false, title: '', date: null, category: 'other' }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(insertMock).not.toHaveBeenCalled()
    expect(matchStudentsMock).not.toHaveBeenCalled()
  })
})
```

Note on asserting against the actor ID: we verify it by reading from the mocked `ApifyClient.actor` call. Extend the mock if you want tighter assertions; for this task, `resultsLimit=3` + one insert of the right shape is sufficient signal.

- [ ] **Step 2: Run the test — expect failure**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: FAIL — the current `instagram.ts` uses `apify/instagram-post-scraper`, doesn't use `validatePost`, doesn't set `resultsLimit=3`, doesn't set `status='active'`, and returns early on empty `accounts` arg. Look for the first failing assertion; most likely it will be the `insert` not being called at all because the old code does `if (handles.length === 0) return` and the new test calls `scrapeInstagram()` with no argument.

- [ ] **Step 3: Rewrite `george/src/scrapers/instagram.ts`**

Replace the full file contents with:

```ts
// Weekly scraper for USC student-org Instagram accounts. Pulls recent posts
// through the apify/instagram-scraper actor, asks the lightweight LLM to
// extract structured event info, validates the output with validatePost, and
// inserts status='active' rows into the events table. Degrades gracefully
// when APIFY_TOKEN is unset. See docs/plans/2026-04-22-instagram-scraper-design.md.
//
// Header last reviewed: 2026-04-22

import { ApifyClient } from 'apify-client'
import { callLightweightLLM } from '../agent/llm-providers.js'
import { config } from '../config.js'
import { supabase } from '../db/client.js'
import { matchStudentsToEvents } from '../jobs/proactive.js'
import { log } from '../observability/logger.js'
import { flattenHandles } from './ig-accounts.js'
import { validatePost } from './instagram-validate.js'

interface ApifyPost {
  caption?: string
  displayUrl?: string
  timestamp?: string
  url?: string
  ownerUsername?: string
}

const RESULTS_LIMIT = 3
const ACTOR_ID = 'apify/instagram-scraper'

const LLM_SYSTEM_PROMPT =
  "Analyze this Instagram post and decide if it announces an upcoming event. " +
  "If you are unsure whether the post announces an event, set isEvent=false. " +
  'Respond in JSON with these exact keys: ' +
  '{"isEvent": true|false, "title": "event name", "description": "brief desc", ' +
  '"date": "ISO 8601 or null", "location": "venue or null", ' +
  '"category": "social|academic|career|cultural|sports|other"}'

async function extractEventFromPost(post: ApifyPost): Promise<unknown> {
  try {
    const raw = await callLightweightLLM(
      [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Caption: ${post.caption || '(no caption)'}\nPosted by: @${post.ownerUsername || ''}\nImage URL: ${post.displayUrl || 'none'}`,
        },
      ],
      { maxTokens: 200, jsonMode: true },
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function scrapeInstagram(): Promise<void> {
  if (!config.apify.token) {
    log('warn', 'instagram_unavailable', { reason: 'no_apify_token' })
    return
  }

  const handles = flattenHandles()
  log('info', 'instagram_scrape_start', { accounts: handles.length })

  let scraped = 0
  let candidates = 0
  let events_inserted = 0
  let llm_rejected = 0
  let validation_rejected = 0

  try {
    const apify = new ApifyClient({ token: config.apify.token })
    const run = await apify.actor(ACTOR_ID).call({
      username: handles,
      resultsLimit: RESULTS_LIMIT,
      resultsType: 'posts',
    })

    const { items } = await apify.dataset(run.defaultDatasetId).listItems()
    scraped = items.length

    for (const post of items as ApifyPost[]) {
      candidates++

      const llmOut = await extractEventFromPost(post)
      if (llmOut === null) {
        llm_rejected++
        continue
      }

      const result = validatePost(llmOut)
      if (!result.valid) {
        if (result.reason === 'not_event' || result.reason === 'not_object') {
          llm_rejected++
        } else {
          validation_rejected++
        }
        continue
      }

      await supabase.from('events').insert({
        title: result.event.title,
        description: result.event.description,
        date: result.event.date,
        location: result.event.location,
        category: result.event.category,
        source: 'instagram',
        source_url: post.url,
        source_account: post.ownerUsername,
        image_url: post.displayUrl,
        status: 'active',
      })
      events_inserted++
    }
  } catch (err) {
    log('warn', 'instagram_unavailable', { error: (err as Error).message })
    return
  }

  log('info', 'instagram_scrape_done', {
    accounts: handles.length,
    scraped,
    candidates,
    events_inserted,
    llm_rejected,
    validation_rejected,
  })

  // CEO review Finding #1: proactive matcher only sees events with
  // created_at >= now-6h. Without this direct call, the freshly inserted
  // batch would only be visible for ~6h once a week. Fire it now while
  // the events are fresh. Wrapped in try/catch so a matcher failure does
  // not poison a successful scrape.
  if (events_inserted > 0) {
    try {
      await matchStudentsToEvents()
    } catch (err) {
      log('warn', 'instagram_post_scrape_match_failed', { error: (err as Error).message })
    }
  }
}
```

Note: this first rewrite intentionally has **no dedup** yet — that is added in Task 5 so we can keep commits small and each green. The happy-path test passes because `maybeSingleMock` returning `{ data: null }` doesn't matter yet (nothing calls it).

- [ ] **Step 4: Run the test — expect pass**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: all assertions in the happy-path test pass.

- [ ] **Step 5: Full suite green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add george/src/scrapers/instagram.ts george/src/index.ts george/tests/scrapers/instagram.test.ts
git commit -m "refactor(instagram): rewrite scraper — new actor + resultsLimit=3 + validatePost + post-scrape matcher"
```

---

### Task 5: Add dedup by `source_url`

**Files:**
- Modify: `george/src/scrapers/instagram.ts`
- Modify: `george/tests/scrapers/instagram.test.ts`

- [ ] **Step 1: Add the failing test**

Append a new `describe` block to `george/tests/scrapers/instagram.test.ts`:

```ts
describe('scrapeInstagram — dedup', () => {
  it('skips posts whose source_url already exists in the events table', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Career Mixer', displayUrl: 'https://cdn/3.jpg', url: 'https://ig/p/dup', ownerUsername: 'sparksc' },
      ],
    })

    // Pretend this source_url already exists
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'existing-id' } })

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    // No LLM call for an already-seen post
    expect(llmMock).not.toHaveBeenCalled()
    // No insert
    expect(insertMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test — expect failure**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: the dedup test fails because the current `instagram.ts` calls the LLM for every post without a pre-check.

- [ ] **Step 3: Add dedup to `instagram.ts`**

Edit `george/src/scrapers/instagram.ts`. Inside the `for (const post of items ...)` loop, **before** `const llmOut = await extractEventFromPost(post)`, insert:

```ts
      if (post.url) {
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('source_url', post.url)
          .maybeSingle()
        if (existing) continue
      }
```

- [ ] **Step 4: Run both describe blocks — expect all pass**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: all happy-path + dedup assertions pass.

- [ ] **Step 5: Full suite green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add george/src/scrapers/instagram.ts george/tests/scrapers/instagram.test.ts
git commit -m "feat(instagram): dedup posts by source_url before LLM call"
```

---

### Task 6: Structured done-log counters

**Files:**
- Modify: `george/tests/scrapers/instagram.test.ts`
- (No code change — the counters were already written in Task 4; this task just pins them with a test.)

- [ ] **Step 1: Add the failing test**

Append to `george/tests/scrapers/instagram.test.ts`:

```ts
describe('scrapeInstagram — structured counters', () => {
  it('logs instagram_scrape_done with the expected counter shape', async () => {
    datasetListItemsMock.mockResolvedValueOnce({
      items: [
        { caption: 'Formal', displayUrl: 'https://cdn/a.jpg', url: 'https://ig/p/a', ownerUsername: 'uscphidelt' },
        { caption: 'Cute pic', displayUrl: 'https://cdn/b.jpg', url: 'https://ig/p/b', ownerUsername: 'uscphidelt' },
        { caption: 'Dated wrong', displayUrl: 'https://cdn/c.jpg', url: 'https://ig/p/c', ownerUsername: 'uscphidelt' },
      ],
    })

    llmMock
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Phi Delt Spring Formal',
        description: 'Formal',
        date: daysFromNow(10),
        location: 'Beverly Hills',
        category: 'social',
      }))
      .mockResolvedValueOnce(JSON.stringify({ isEvent: false, title: '', date: null, category: 'other' }))
      .mockResolvedValueOnce(JSON.stringify({
        isEvent: true,
        title: 'Past-date event',
        description: 'x',
        date: daysFromNow(-5),
        location: 'x',
        category: 'social',
      }))

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    const doneCall = logMock.mock.calls.find((c) => c[1] === 'instagram_scrape_done')
    expect(doneCall).toBeDefined()
    expect(doneCall![2]).toMatchObject({
      scraped: 3,
      candidates: 3,
      events_inserted: 1,
      llm_rejected: 1,
      validation_rejected: 1,
    })
  })
})
```

- [ ] **Step 2: Run the test — expect pass on first try**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: passes immediately because the counters are already implemented in Task 4. If it fails, the implementation in Task 4 was wrong — go back and fix.

- [ ] **Step 3: Full suite green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add george/tests/scrapers/instagram.test.ts
git commit -m "test(instagram): pin instagram_scrape_done counter shape"
```

---

### Task 7: Graceful degrade when `APIFY_TOKEN` unset

**Files:**
- Modify: `george/tests/scrapers/instagram.test.ts`
- (No code change — graceful-degrade guard was written in Task 4; this task pins it.)

- [ ] **Step 1: Add the failing test**

Append to `george/tests/scrapers/instagram.test.ts`:

```ts
describe('scrapeInstagram — graceful degrade', () => {
  it('logs instagram_unavailable and returns when APIFY_TOKEN is empty', async () => {
    // Re-import with the env var empty. Because config.ts caches at import time,
    // we reset modules so the next import sees APIFY_TOKEN=''.
    process.env.APIFY_TOKEN = ''
    vi.resetModules()

    const { scrapeInstagram } = await import('../../src/scrapers/instagram.js')
    await scrapeInstagram()

    expect(actorCallMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
    const warnCall = logMock.mock.calls.find((c) => c[0] === 'warn' && c[1] === 'instagram_unavailable')
    expect(warnCall).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd george && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run tests/scrapers/instagram.test.ts
```

Expected: all blocks pass. If the new block fails, the Task 4 guard `if (!config.apify.token) { log('warn', ...); return }` is wrong — go back and fix.

**Gotcha:** because `vi.resetModules()` invalidates the cached `../../src/observability/logger.js` mock for the re-imported `instagram.ts`, make sure the `vi.mock(...)` calls at the top of the test file are hoisted (vitest hoists `vi.mock` automatically), not nested in a `beforeEach`. If you see `logMock` not being invoked after `resetModules`, move the `vi.mock(...)` calls to module top-level if they aren't already.

- [ ] **Step 3: Full suite green**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add george/tests/scrapers/instagram.test.ts
git commit -m "test(instagram): pin graceful degrade when APIFY_TOKEN is unset"
```

---

### Task 8: Change cron schedule to weekly

**Files:**
- Modify: `george/src/index.ts:134-138`

- [ ] **Step 1: Read the current cron block**

Read `george/src/index.ts` around lines 134-138. The block currently reads:

```ts
cron.schedule('0 */4 * * *', () => {
  scrapeInstagram().catch((err) => {
    log('error', 'instagram_cron_error', { error: err.message })
  })
})
```

- [ ] **Step 2: Change the cron expression**

Replace `'0 */4 * * *'` with `'0 0 * * 1'`. Keep everything else in the block unchanged. Add a trailing inline comment to make the intent obvious to future readers:

```ts
cron.schedule('0 0 * * 1', () => {
  // Weekly: Mon 00:00 UTC = Sun 17:00 PT. APIFY Starter budget assumes weekly.
  scrapeInstagram().catch((err) => {
    log('error', 'instagram_cron_error', { error: err.message })
  })
})
```

(Task 4 already removed the stale `accounts` arg from the admin endpoint — this task only touches the cron expression.)

- [ ] **Step 3: Typecheck + full suite**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

Expected: both green. If tsc complains about the admin endpoint, fix it here per the note above.

- [ ] **Step 4: Commit**

```bash
git add george/src/index.ts
git commit -m "chore(instagram): weekly cron (0 0 * * 1)"
```

---

### Task 9: Smoke-test runbook for Bob

**Files:**
- Create: `docs/plans/2026-04-22-instagram-scraper-smoke-runbook.md`

This is a docs-only task, no tests.

- [ ] **Step 1: Write the runbook**

Create `docs/plans/2026-04-22-instagram-scraper-smoke-runbook.md`:

```markdown
# Instagram scraper — real-key smoke test runbook

One-time check to run after setting `APIFY_TOKEN` in prod (or local `.env`).

## Prereq

1. APIFY account on the Starter $5/mo plan.
2. `APIFY_TOKEN` set in the same environment `george` runs in.
3. Admin bearer token (`ADMIN_TOKEN` env var) loaded on the server — same one used for `/admin/scrape-usc`.
4. George process restarted so the new `APIFY_TOKEN` is picked up (`config.ts` reads env at import).

## Trigger

```bash
curl -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    https://<george-host>/admin/scrape-instagram
```

Expected response: `{"status":"ok"}` (HTTP 200).

## What to check

1. Server logs should show an `instagram_scrape_start` line followed by `instagram_scrape_done` with counters:

   ```
   { accounts: 22, scraped: ~66, candidates: ~66, events_inserted: 1-10, llm_rejected: N, validation_rejected: N }
   ```

2. Open the Supabase dashboard → `events` table. Filter `source = 'instagram'` + `created_at > now() - interval '5 minutes'`. Rows should have `status='active'`, populated `source_url`, `source_account`, `image_url`, and a future `date`.

3. In the APIFY console → Actors → Runs, verify there is one run for `apify/instagram-scraper` and it consumed < $0.25 in compute credits for the run.

## Rollback

If the inserted rows look wrong, run:

```sql
UPDATE events
    SET status = 'archived'
    WHERE source = 'instagram'
    AND created_at > now() - interval '1 hour';
```

Then open an issue on GitHub with the logged counters and a screenshot of the worst offending row. Do not delete the rows — keep them for LLM prompt tuning.

## Leaving it on

After one successful smoke test, the weekly cron (`0 0 * * 1` UTC) picks up automatically. No further action unless APIFY burn rate or LLM accuracy data says otherwise.
```

- [ ] **Step 2: Commit**

```bash
git add docs/plans/2026-04-22-instagram-scraper-smoke-runbook.md
git commit -m "docs(instagram): smoke-test runbook for real APIFY_TOKEN"
```

---

### Task 10: Final pre-PR check

**Files:** none

- [ ] **Step 1: Confirm branch state vs origin/main**

```bash
git log --oneline origin/main..HEAD
```

Expected: 9 commits (Tasks 1-9), newest first. If any commit is missing, find the gap and re-do that task.

- [ ] **Step 2: Run the full suite one more time**

```bash
cd george && npx tsc --noEmit && ANTHROPIC_API_KEY=test SUPABASE_URL=http://x SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x npx vitest run
```

Expected: tsc clean, vitest passes (the single pre-existing skill-flow failure is OK; any new failure blocks PR).

- [ ] **Step 3: Grep for leftover placeholder code**

```bash
git grep -n "apify/instagram-post-scraper"
git grep -n "@ts-expect-error" george/src/scrapers/
git grep -n "0 \*/4 \* \* \*"
```

Expected: all three return zero matches. If any hits exist in `george/src/`, revisit the task that was supposed to remove them.

- [ ] **Step 4: Verify file-header invariant**

```bash
grep -rn "Header last reviewed: 2026-04-22" george/src/scrapers/
```

Expected: at least 3 matches (`instagram.ts`, `ig-accounts.ts`, `instagram-validate.ts`). If fewer, add missing headers per the project's CLAUDE.md "File Header Maintenance" rule.

- [ ] **Step 5: No commit in this task** — it's a verification step only. If any check above fails, fix it in the task it belongs to, not here.

---

## Self-review (plan author, before handoff)

- **Spec coverage:** every bullet in the design spec's Architecture, File layout, Validation rules, Error handling, Logging, and Testing sections maps to at least one task above. The "Not doing (YAGNI)" list stays out of the plan.
- **Placeholders:** none remaining. All code blocks are complete and copy-paste runnable.
- **Type consistency:** `ValidationResult`'s `reason` union uses the same five tokens (`not_object`, `not_event`, `title_length`, `date_invalid`, `date_out_of_window`) in both the type declaration (Task 3) and the integration test's counter bucketing (Task 4, Task 6).
- **Green-between-commits:** every commit leaves `tsc` + `vitest` green because: Task 1 is a dep bump only, Tasks 2-3 add new files consumed by nothing yet, Task 4 is the single commit that swaps the old `instagram.ts` body (and ships with passing integration tests), Tasks 5-7 add incremental behavior behind the same test file, Tasks 8-9 are config + docs.
- **Plan scope:** one subsystem (the scraper) — no decomposition needed.

---

## Execution options

**1. Subagent-driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
**2. Inline execution** — execute tasks in this session with executing-plans, batch checkpoints.
