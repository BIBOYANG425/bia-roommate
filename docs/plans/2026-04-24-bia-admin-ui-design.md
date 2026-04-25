# BIA Admin UI design

Admin surface for the BIA officer team (5–8 people) covering event submissions,
event editing, and Instagram follow list. Lives inside the existing
`bia-roommate/app/admin` shell alongside the shipping admin from PR #32.
George reacts to material event edits via an outbox table so reminder-setters
get pushed an update on their platform within ~30 seconds.

Status: approved 2026-04-24. Owner: bia-roommate (frontend) + george
(outbox worker).

## Problem

Three workflows currently force BIA officers into Supabase Studio:

1. **Event submissions** — community-submitted events land in
   `event_submissions` with `status='pending'`. Officers approve them by
   manually copying fields into the `events` table in Studio. No audit
   trail beyond Postgres `updated_at`.
2. **Instagram follow list** — currently hard-coded in
   `george/src/scrapers/ig-accounts.ts` (per the PR #37 spec). Adding a
   new student-org handle requires a code change and a george deploy.
3. **Event editing** — auto-scraped events from the USC feed and the
   (forthcoming) Instagram scraper land with imperfect titles, dates, or
   categories. Fixing them in Studio is fragile (no validation, no audit,
   no notification to interested students).

Reminder-setters never learn that an event they're tracking has changed
unless they re-ask George, because the `reminders` table holds a fixed
`remind_at` and there is no edit-propagation path today.

## Goal

A polished admin section under `/admin/events`, `/admin/events/submissions`,
`/admin/events/[id]`, and `/admin/instagram` that the full BIA officer team
(5–8 people) can use weekly without hand-holding from Bobby. Edits to
material event fields automatically push an update to every student with a
reminder for that event, on the platform they last used.

Non-goals:

- **Chat log viewer** (deferred to v1.5). Officers debug George's voice in
  Studio for now.
- **Sublet / squad / course-review moderation** (v1.5). Volume is low
  enough that complaints route through the founder.
- **Role separation.** Single `isAdmin` flag for the team. Audit log
  preserves accountability without RBAC complexity.
- **Luma RSVP sync.** Notify-on-edit fans out to reminder-setters only
  in v1; Luma attendees rely on Luma's own emails. v1 ships with a
  forward-compatible `events.luma_event_id` column so v1.5 can layer on
  the sync without schema migration.
- **Optimistic locking on concurrent edits.** Last-write-wins, audit log
  preserves history. Add `updated_at` precondition in v1.5 if collisions
  surface.
- **E2E browser tests, integration tests against a real Supabase, load
  tests.** Match the bar the shipping admin set: vitest unit tests on
  pure logic, plus a manual smoke checklist.

## Architecture

```
                  ┌─ bia-roommate (Next.js) ─────────────────────┐
                  │                                              │
  Officer ─►──── /admin (existing AdminShell + isAdmin auth)     │
                  │   ├── /events                — list/edit     │
                  │   ├── /events/submissions    — pending queue │
                  │   ├── /events/[id]           — edit detail   │
                  │   └── /instagram             — handle CRUD   │
                  │                                              │
                  │  Server Actions ──► supabase.service-role    │
                  └────────────────┬─────────────────────────────┘
                                   │  writes
                                   ▼
              ┌─────────────── Shared Supabase ────────────────┐
              │                                                │
              │  events  event_submissions  reminders          │
              │  instagram_accounts (NEW)                      │
              │  admin_audit_log    (NEW)                      │
              │  george_jobs        (NEW — outbox)             │
              └────────────────────┬───────────────────────────┘
                                   │  reads + processes outbox
                                   ▼
              ┌─────────────── george service ────────────────┐
              │                                                │
              │  Tools: search_events, get_event_details, ...  │
              │  Cron: proactive (3h), reminder-sender (5m)    │
              │  Cron: admin-job-worker (30s)  (NEW)           │
              │  Scraper: instagram (reads instagram_accounts) │
              └────────────────────────────────────────────────┘
```

Three observations make this layout work without coupling admin and george
deploys:

1. **Shared Supabase = automatic propagation for queries.** George reads
   `events` at the moment a student asks `什么活动`. An admin edit is
   visible at the next query — no message-bus, no cache-invalidation,
   nothing.
2. **Outbox table for the rare push case.** Material edits enqueue a job
   in `george_jobs`. George's new 30-second worker drains it, fans out
   per-student notifications, and marks the job done. Durable across
   george restarts; idempotent on retry.
3. **Auth reuse.** The shipping admin already proved the
   `lib/admin.getAuthContext()` + `<AdminShell>` pattern. Single
   `isAdmin` boolean is enough for 5–8 trusted officers; the audit log
   gives accountability without RBAC.

## Components

### Admin pages (4 new files in `app/admin/`)

| Path | Purpose | Key UI |
|---|---|---|
| `events/submissions/page.tsx` | Pending queue | Table of pending rows with submitter + raw description preview; per-row Approve / Edit-then-approve / Reject |
| `events/page.tsx` | All events | Filter (source / status / date range / search), sortable table, source + status badges, "Edit" → detail page |
| `events/[id]/page.tsx` | Edit one event | Form for title / description / date / location / category / status / `luma_event_id`, "Mark featured" toggle, audit-log sidebar |
| `instagram/page.tsx` | IG follow list | Three grouped lists (frats / troyLabs / sep), add-handle row, deactivate / reactivate toggle, "Trigger scrape now" button |

All four use `<AdminShell>` from existing layout. Nav item "Events" added
between "Users" and "Shipping" in the shell.

### Server Actions (`lib/admin/actions/`)

```
events.ts
  approveSubmission(submissionId, overrides?)
    → tx { insert events; update event_submissions.status='approved';
           insert admin_audit_log; insert george_jobs(event_approved) }
  rejectSubmission(submissionId, reason?)
    → tx { update event_submissions.status='rejected'; insert audit_log }
  updateEvent(eventId, fields)
    → tx { update events; insert audit_log;
           if material_field_changed: insert george_jobs(event_changed) }
  cancelEvent(eventId)
    → updateEvent with status='cancelled' (always material → enqueues job)

instagram-accounts.ts
  addHandle({handle, group}) | removeHandle(id) | toggleActive(id)
    → tx { mutate instagram_accounts; insert audit_log }
  triggerScrape() → POST george /admin/scrape-instagram
```

`material_field` ∈ {`date`, `location`, `status`, `title`}. Cosmetic edits
(description, image_url, category, is_featured) update `events` and
`admin_audit_log` only — no outbox, no notification spam.

Every Server Action runs inside one Supabase transaction so audit log and
outbox stay consistent with the entity write.

### New DB tables

```sql
-- 002_admin_ui.sql migration

create table instagram_accounts (
  id           uuid primary key default gen_random_uuid(),
  handle       text not null unique,
  group_name   text not null,
  active       boolean not null default true,
  added_by     text not null,
  added_at     timestamptz not null default now()
);
create index on instagram_accounts (active);

create table admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  admin_email   text not null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  payload       jsonb not null default '{}'::jsonb,
  ts            timestamptz not null default now()
);
create index on admin_audit_log (entity_type, entity_id, ts desc);

create table george_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_type      text not null,
  payload       jsonb not null,
  status        text not null default 'pending'
                check (status in ('pending','processing','done','failed')),
  attempts      int not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz
);
create index on george_jobs (status, created_at) where status = 'pending';

alter table events add column luma_event_id text;
alter table events add column is_featured boolean not null default false;
```

Backfill: seed `instagram_accounts` from the current
`george/src/scrapers/ig-accounts.ts` const at migration time, then delete
the const file.

### george-side changes

**`george/src/jobs/admin-job-worker.ts`** (new) — cron every 30s, claims
up to 10 pending jobs atomically, dispatches by `job_type`:

| `job_type` | Handler |
|---|---|
| `event_changed` | Look up reminders for `event_id`. For each, send via `sendMessage(student.platform, formatEditNotice(event, fields_changed))`. Per-student try/catch: one expired token does not poison the batch. Mark job `done`. |
| `event_approved` | Run a one-shot `matchStudentsToEvents` pass scoped to the single event so the BIA flagship event does not wait up to 3 hours for the proactive cron. |
| `instagram_account_added` | No-op in v1; reserved for v1.5 immediate scrape. |

**`george/src/scrapers/instagram.ts`** — replace the `IG_ACCOUNTS` const
import with `select handle, group_name from instagram_accounts where
active = true`. Drops `ig-accounts.ts` once the migration backfills the
table.

## Data flow

### A. Approve a community submission

```
Officer clicks "Approve" on /admin/events/submissions
        │
        ▼
approveSubmission(submissionId)  [Server Action]
        │
        ▼ ── one Supabase transaction ───────────────────────────
            │
            ├── insert into events (... copied from submission)
            │       returning event_id
            │
            ├── update event_submissions
            │       set status='approved', approved_event_id=event_id
            │
            ├── insert into admin_audit_log
            │       (admin_email, 'approve_submission', 'event', event_id,
            │        {submission_id, original_fields, overrides})
            │
            └── insert into george_jobs
                    (job_type='event_approved', payload={event_id})
        ──────────────────────────────────────────────────────────
        │
        ▼
UI revalidates submissions page (Next.js revalidatePath)
        │
        ▼  (within ≤30s, async)
george admin-job-worker claims the job
        │
        ▼
matchStudentsToEvents(scoped: event_id) — proactive push fires now
instead of waiting up to 3 hours for the cron
```

UI feels instant (transaction commits in <100ms). Reminder fan-out is N/A
here — students cannot have reminders for an event that did not yet exist.

### B. Edit a material field on an event

```
Officer changes date from "Tue 6pm" → "Wed 7pm" on /admin/events/[id]
        │
        ▼
updateEvent(eventId, {date: '...'})  [Server Action]
        │
        ▼ ── one Supabase transaction ──────────────────────────
            │
            ├── update events set date = '...' where id = eventId
            ├── insert into admin_audit_log
            │       ('update_event', 'event', eventId,
            │        {fields_changed: ['date'], before: {...}, after: {...}})
            └── insert into george_jobs
                    (job_type='event_changed',
                     payload={event_id, fields_changed: ['date']})
        ──────────────────────────────────────────────────────────
        │
        ▼  (≤30s)
admin-job-worker claims the job
        │
        ▼
SELECT student_id FROM reminders
WHERE event_id = $1 AND sent IS DISTINCT FROM TRUE
        │
        ▼  for each student
sendMessage(student.platform, formatEditNotice(event, ['date']))
   → "嗨！你之前提醒了 miHoYo 招聘活动，时间改了：
       原 周二 6pm → 现 周三 7pm @ TCC。要不要我帮你重置提醒？"
        │
        ▼
job marked done; reminders rows for this event updated to pull
the new `remind_at` (event.date - 1h, per existing reminder rule)
```

Cosmetic edits (description, image_url, category, is_featured) update
`events` + `admin_audit_log` only — no `george_jobs` insert. George reads
the new value at next query; students never get a "we fixed a typo" ping.

Cancellation is the special case of B. `status='cancelled'` is always
material; copy switches to "活动取消啦" instead of "改了". Reminder rows
for cancelled events get `sent=true` so the reminder cron skips them.

### C. Add an IG handle

```
Officer types "uscbiausc", picks group "BIA-related"
        │
        ▼
addHandle({handle: 'uscbiausc', group: 'bia'})  [Server Action]
        │
        ▼ ── tx ──────────────────────────────────────────
            ├── insert into instagram_accounts
            ├── insert into admin_audit_log
            └── (no george_jobs in v1 — next weekly cron picks it up)
        ───────────────────────────────────────────────────
        │
        ▼  (≤7 days, on next Mon 00:00 UTC)
george scrapeInstagram() runs
  → SELECT handle FROM instagram_accounts WHERE active = true
  → includes 'uscbiausc' in the Apify call
  → new posts surface as events
```

"Trigger scrape now" button calls george's existing
`POST /admin/scrape-instagram` endpoint with the bearer admin token. Used
for "I just added a handle and want to test it."

## Error handling

### 1. Server Action mid-flight failure

Each Server Action is one Postgres transaction (a `plpgsql` function
called via `supabase.rpc(...)`, or supabase-js multi-statement transaction).
All-or-nothing. UI surfaces the error to a toast; officer can retry. No
half-applied state ever.

### 2. Outbox worker failure

```
admin-job-worker claims a job (atomic UPDATE … WHERE status='pending')
  │
  ├── handler succeeds → status='done', processed_at=now()
  ├── handler throws (transient: timeout, network, supabase 5xx)
  │     attempts++, status back to 'pending', last_error stored
  │     next 30s tick re-attempts
  └── attempts >= 3 → status='failed'
        Visible via raw query in v1; v1.5 adds /admin/system/jobs page.
        Triggers a logger 'admin_job_failed' alert.
```

Capping at 3 attempts prevents a poisoned job from burning cycles forever.
The original mutation always succeeded — only the side effect failed — so
officers can manually re-trigger via Studio in v1, or via the v1.5
"Re-run" button.

### 3. Reminder fan-out: partial delivery failure

Inside the `event_changed` handler each student notification is its own
try/catch. A single expired WeChat token does not poison the batch;
per-student failures log a `warn` event and the loop continues. Job
marks `done` even if some sends failed. Once-and-forget is acceptable for
"FYI the date moved." If we ever want delivery guarantees we split fan-out
into one outbox job per student.

### 4. Concurrent edits

Two officers open the same event in two tabs: last-write-wins. Audit log
preserves the full history so a clobbered edit can be reconstructed. No
optimistic locking in v1. Add `updated_at` precondition on the UPDATE in
v1.5 (~10 lines) if complaints surface.

### 5. State-machine reverts

Cancelled-then-uncancelled, rejected-then-approved, and similar one-way
edge cases stay out of v1. Officers fix them in Studio; the audit log
records the manual override.

## Testing

bia-roommate uses **vitest** with tests under `lib/__tests__/`. The
shipping admin shipped with unit tests only; match that bar.

### Unit tests

`lib/__tests__/admin/`:

| File | Covers |
|---|---|
| `events-actions.test.ts` | `approveSubmission`, `updateEvent`, `cancelEvent` build the right tx shape (mocked Supabase received the right calls in the right order). Material-vs-cosmetic field detection. Audit log payload shape. |
| `instagram-actions.test.ts` | `addHandle` validates format (lowercase alphanumeric + `_` + `.`, 1–30 chars per IG rules), rejects duplicates, audit log written. |
| `format-edit-notice.test.ts` | Pure function `formatEditNotice(event, fields_changed) → string`. Cases: date changed, location changed, status='cancelled', multiple fields, generic fallback. |
| `auth-guard.test.ts` | Server Actions throw 403 when `isAdmin` is false; 401 when no session. |

`george/tests/jobs/`:

| File | Covers |
|---|---|
| `admin-job-worker.test.ts` | Atomic claim (parallel workers do not double-claim), dispatch by `job_type`, retry on transient failure, mark `failed` after 3 attempts, partial fan-out (1 reminder fails, 2 succeed → job still done). |
| `instagram-scraper.test.ts` (extend) | Reads from `instagram_accounts` DB table, not the deleted const. |

### Skipped in v1

- E2E browser tests (no Playwright in repo; not worth standing up for a 4-page admin)
- Integration tests against a real Supabase (shipping admin shipped without these; staying consistent)
- Load tests (admin is for 5–8 officers, not 1500 students)

### Smoke checklist (manual, pre-launch)

1. Officer logs in with non-admin email → `/admin` redirects (existing
   behavior; verify no regression).
2. Approve a real pending submission → event appears in `/admin/events`
   AND surfaces when a test student asks George "什么活动".
3. Edit a real event's date → reminder-setter receives WeChat / iMessage
   notification within 60s.
4. Add an IG handle → click "Trigger scrape now" → handle appears in
   next `instagram_scrape_done` log line with `accounts: N+1`.
5. Cancel an event with reminders → reminder-setters get cancellation
   push; reminder cron skips the event when next due.
6. Audit log shows correct admin email + action for all of the above.

## Risks accepted

Three issues v1 accepts; revisit if they bite:

1. **Last-write-wins on concurrent edits.** Audit log preserves history
   so a clobbered edit can be reconstructed manually. Likely fine for a
   5–8 person team; add `updated_at` precondition in v1.5 if it bites.

2. **Reminder fan-out is once-and-forget.** Per-student delivery
   failures are logged but not retried. A student whose WeChat token
   expired silently misses the edit notice. Acceptable for "FYI the
   date moved"; not acceptable for "the event was cancelled" — this is
   the v1.5 split-into-per-student-jobs trigger.

3. **No officer-facing UI for failed jobs.** v1 surfaces failed
   `george_jobs` only via raw query in Studio. v1.5 adds
   `/admin/system/jobs` with a Re-run button. Until then, officers
   pinging Bobby is the escape valve.

## Follow ups

- v1.5 surfaces: chat log viewer, sublet / squad / course-review
  moderation, optimistic locking, system-jobs page, per-student
  reminder retry.
- Luma sync: admin edit → Luma API update → Luma emails attendees,
  while George push handles reminder-setters. Schema is
  forward-compatible (`events.luma_event_id` already in v1).
- Role separation if the team grows past 8 or if an officer abuses
  delete authority.
