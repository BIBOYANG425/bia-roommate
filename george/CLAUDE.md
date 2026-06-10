# george (george-api.uscbia.com)

@AGENT.md

## What this repo is

The AI agent backend for BIA. An Express server (Node 20+) that runs George Tirebiter, BIA's bilingual AI companion for USC international students. Lives on three platforms:

- **Web chat** at https://uscbia.com/george/chat → POST `/chat` (relayed via `/api/george/chat` in bia-roommate)
- **iMessage** (private beta, Mac-host only) via `@photon-ai/imessage-kit`
- **WeChat Official Account** (coming next) via the XML webhook adapter

The full persona, voice fingerprint, sub-agent split, and domain rules live in `AGENT.md` and `src/agent/personality.ts`. Read those before changing how George talks. Voice is the product here, not the wiring.

## What this repo is NOT

- **Not a Next.js project.** Express only. No SSR, no JSX, no `app/`.
- **Not a place for user-facing pages.** The `/george` marketing page and `/george/chat` UI live in bia-roommate. This repo serves an HTTP API.
- **Not the Supabase schema owner.** Migrations live in bia-admin/supabase/migrations. This repo reads from and writes to existing tables (`students`, `messages`, `reminders`, `events`).
- **Not cloud-friendly out of the box.** The iMessage adapter requires macOS + Full Disk Access. To deploy to Fly.io or Railway, set `IMESSAGE_ENABLED=false` and accept that iMessage stops working in that instance.

## The BIA platform (3 repos)

```
BIBOYANG425/bia-roommate           uscbia.com
  Next.js + Vercel. Landing + 新生services
  + blog + George UI pages + Chrome extension.
                │
                │  POST /api/george/chat
                │  (relay through tunnel)
                ▼
BIBOYANG425/george                 george-api.uscbia.com (planned)
  Express + Node. Agent backend.
  Persona, intent classifier, 5 sub-agents,
  24 tools, Supabase memory, WeChat + iMessage
  adapters, scrapers, cron jobs.
  This repo.

BIBOYANG425/bia-admin              admin.uscbia.com
  Next.js + Vercel. Officer dashboard.
  Owns supabase/migrations and the
  @biboyang425/bia-shared package.
```

The relay in bia-roommate forwards to `GEORGE_BACKEND_URL` (Cloudflare quick tunnel today, named tunnel at `george-api.uscbia.com` planned). The contract is:

- Request: `POST /chat` with `Authorization: Bearer $ADMIN_TOKEN`, body `{ userId, platform: 'imessage' | 'wechat', text }`.
- Response: `{ response: string }` or `{ error: string }`.

If you change either side of that contract, the matching change goes in bia-roommate the same day.

## How to run locally

```bash
npm install
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, KIMI_API_KEY, APIFY_TOKEN,
# GOOGLE_MAPS_API_KEY, ADMIN_TOKEN
npm run dev
```

Health check:
```bash
curl http://localhost:3001/health
# → {"status":"ok","character":"George — BIA 学长","tools":24}
```

Chat test (replace `$TOKEN` with your `ADMIN_TOKEN`):
```bash
curl -X POST http://localhost:3001/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"dev","platform":"imessage","text":"hi 学长"}'
```

### Running with iMessage

1. macOS Sequoia or later
2. iMessage signed in
3. Grant Full Disk Access to the node binary (System Settings → Privacy & Security → Full Disk Access → add `/opt/homebrew/bin/node` or your local node binary)
4. Set `IMESSAGE_ENABLED=true` in `.env`
5. `npm run dev` — the adapter starts watching the iMessage db on disk

### Running for web chat only (no iMessage)

1. `IMESSAGE_ENABLED=false`
2. Start a Cloudflare tunnel: `cloudflared tunnel --url http://localhost:3001`
3. Take the printed `*.trycloudflare.com` URL and set it as `GEORGE_BACKEND_URL` on bia-roommate's Vercel project
4. Set the same `ADMIN_TOKEN` value as `GEORGE_ADMIN_TOKEN` on Vercel
5. uscbia.com/george/chat now relays here

## How to deploy

**Mac-host (today's mode):** run on Bobby's Mac with `npm run dev` plus a `cloudflared` quick tunnel. iMessage works. Web chat works. Mac sleep or `cloudflared` exit = chat returns the fine-tune fallback message.

**Cloud (planned):** deploy via the included `Dockerfile` to Fly.io or Railway. Set `IMESSAGE_ENABLED=false`. Web chat works in the cloud. iMessage continues on the Mac as a parallel instance pointing at the same Supabase.

**Named tunnel (planned):** `cloudflared tunnel create george-api` + DNS CNAME at `george-api.uscbia.com` once the Cloudflare DNS migration finishes. Replaces the rotating quick-tunnel URL with a stable hostname.

## Guardrails

- **Persona is the product.** The rules in `AGENT.md` are non-negotiable. Read it before editing `src/agent/personality.ts` or `src/agent/bia-lore.ts`. The founder voice was distilled from real WeChat messages. Don't smooth it out.
- **No invented facts.** Course numbers, professor names, event dates, prices. If George doesn't know, he says "戳到知识盲区了😢" and uses a tool.
- **Tool registration is side-effect imports.** Every new tool file must be imported in `src/index.ts` to register itself with the tool registry. Forgetting this is the #1 "the tool exists but George can't call it" bug. There is no auto-discovery.
- **Supabase service-role key has full DB access.** Use it only inside `src/db/*` helpers. Never expose via HTTP. Never log it.
- **Rate limit on /chat.** 10 messages per minute per `userId` via the LRU cache in `src/adapters/rate-limiter.ts`. Don't bypass.
- **Injection filter at the door.** `checkInjection()` runs on every message before anything else. Don't skip.
- **Admin token gate on `/chat`.** Requires `Authorization: Bearer $ADMIN_TOKEN`. Never log the token or echo it in error responses.
- **Mac-only code stays env-gated.** Anything Photon SDK related sits behind `if (config.imessageEnabled)`. The cloud deploy depends on this. Importing the Photon SDK unconditionally breaks `npm install` on Linux.
- **Onboarding gates all other features.** Until the 4 profile fields (major, year, sleep habit, social visibility) are set, sub-agents return the onboarding prompt. Don't bypass.

## Cross-repo coordination

Changes here that require coordinated changes:

- **`/chat` request or response shape** → matching change in bia-roommate's `/api/george/chat` relay route.
- **New Supabase table or column** → schema migration goes in bia-admin first. George only reads or writes existing tables.
- **New env var George reads** → update `.env.example` here, update deploy docs, update Bobby's Mac `.env`, and if it's required for web chat too, set it on bia-roommate's Vercel project.
- **Behavioral changes that visitors will notice** (new tools, new sub-agent behavior, persona shifts) → ping Bobby. Web chat hits real users.

## Persona source map

For voice and persona edits, see the "Prompt source map" section in `AGENT.md`. All voice changes go through `src/agent/personality.ts` and `src/agent/bia-lore.ts`. The agent harness in `src/agent/george.ts` is wiring (rate limit, injection filter, intent classifier, tool-use loop, audit log). Voice does not belong there.

## Skill routing

When the user's request matches an available skill, use that skill's workflow before
answering directly. Persona work especially benefits from `/superpowers:brainstorming`
before code touches `personality.ts`.

Key routing rules:

- Persona / voice changes, "George doesn't sound right" → invoke brainstorming, then edit
- Bugs, "why isn't this tool firing", 500 errors → invoke investigate
- New tool design → invoke office-hours first
- Architecture or new sub-agent → invoke plan-eng-review
- Ship, deploy, create PR → invoke ship
