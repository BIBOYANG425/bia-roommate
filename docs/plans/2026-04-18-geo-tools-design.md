# George geo tools design

Give George real geographic awareness so claims like "K town is walkable" stop
shipping. Real time Google Maps Platform queries, not a static lat/lng table.
Community rankings are deferred until the BIA website has articles we can mine.

Status: approved 2026-04-18
Owner: George agent

## Problem

A real student asked George for walking distance food and George said K town.
K town is a twenty minute drive, not a walk. The underlying issue: the prompt
and the `campus_knowledge` prose corpus can describe places but cannot reason
about distance or travel time. Any question of the form "is X reachable from Y
on foot" is outside what text retrieval can answer.

We also see the same class of error for building to building walks, late night
safety circle decisions, and "where can I grab coffee before my next class."

## Goal

George can answer "can I walk to X from Y" with a number of minutes, not a
guess, and can recommend places filtered by actual travel time from wherever
the student currently is.

Non goals: building our own POI database; building a Beli style ranking
system; persisting Google Places results long term (Google ToS forbids).

## Architecture

Two new tools exposed to the agent, backed by a thin Google Maps Platform
client and a hand curated USC alias table.

```
src/services/google-maps.ts   Low level client: geocode, placesNearby, distanceMatrix.
                              Two internal LRU caches. Timeout + retry + graceful
                              fallback on API errors.
src/services/usc-aliases.ts   ~38 canonical USC + LA area locations mapped to
                              (lat, lng, neighborhood). Avoids round tripping to
                              Google for "Frat Row" or "K town".
src/tools/places.ts           Registers two tools with the tool registry:
                                travel_time(from, to, mode)
                                find_places_near(origin, category, radius, mode)
```

## Data flow, canonical query

User asks "Parkside 附近有什么好吃的" in the campus sub agent.

1. Sub agent calls `find_places_near(origin="Parkside", category="food", radius_km=0.5, mode="walking")`.
2. Tool normalizes "Parkside" and hits the alias table. Returns lat/lng.
3. Tool calls Google Places Nearby Search around those coordinates, category food.
4. Tool picks the top 5 candidates by Places Search rating. Keeping the
   candidate count bounded is still a good latency / output-quality choice
   (fewer, better picks beats a list of 10), though with Google's per-SKU
   free tiers it is no longer load-bearing for cost. See Cost section.
5. Tool calls Google Distance Matrix on those 5, walking mode. Uses the same
   20-min walkability threshold as `travel_time.walkable`: anything over 20
   min falls out of the list for walking-mode queries. Sorts remaining by
   walking time then rating.
6. Tool returns JSON: `[{name, google_rating, travel_minutes, travel_mode, neighborhood}, ...]`.
7. The sub agent layers in any matching `campus_knowledge.food` rows so BIA
   verified spots get cited first, then fills with Google discoveries.

## Tool signatures

### travel_time(from, to, mode)

Purpose: answer "is X walkable from Y" and "how long does it take to get from Y to X by mode".

Input:
- `from`: string, anything from the alias set or a geocodable LA address
- `to`: string, same shape
- `mode`: `"walking" | "driving" | "transit" | "bicycling"`, default `walking`

Output:
- `minutes`: number
- `km`: number
- `walkable`: boolean, true iff `mode == walking` and `minutes <= 20`
- `mode`: echoed back

Error shapes:
- `{ error: "need_location", hint: "..." }` when origin or destination cannot be resolved
- `{ error: "geo_unavailable" }` on timeout, retry failure, or rate limit
- `{ error: "geo_disabled" }` when `GOOGLE_MAPS_API_KEY` is not set
- `{ error: "geo_budget_exceeded" }` when the per-student geo-tool budget (see
  Per-student rate limit) is exhausted for the current hour window

### find_places_near(origin, category, radius_km, mode)

Purpose: "good food near me" style discovery.

Input:
- `origin`: string
- `category`: `"food" | "cafe" | "grocery" | "gym" | "pharmacy" | "library" | "study_spot"`
- `radius_km`: number, default 0.5 for food, 1.0 for others, capped at 3
- `mode`: `"walking" | "driving"`, default `walking`

Output: up to 5 POIs
- `name`
- `google_rating` (optional)
- `travel_minutes`
- `travel_mode`
- `neighborhood` (derived from lat/lng and the alias regions)

Error shapes: same set as `travel_time` (`need_location`, `geo_unavailable`,
`geo_disabled`, `geo_budget_exceeded`).

## USC alias table

About 38 entries. Hand curated, versioned in the repo, updated when a student
uses an unknown alias twice in a week.

Coverage:
- Dorms: Parkside (cluster anchor at A7, covers PKS / PRB / IRC), Webb Tower, University Gateway, Pardee Tower, New North, Fluor Tower, Cardinal Gardens, Century Apartments
- Landmarks: Tommy Trojan, Lyon Center, Leavey, Doheny, USC Village / McCarthy, Ronald Tutor, Annenberg, Watt Hall, Bovard, JFF (Fertitta / Fertitta Café), THH (Taper Hall), DMC / VKC / CPA (same building, renamed; "Dr. Joseph Medicine Crow Center for International and Public Affairs", formerly Von KleinSmid Center, PDF code CPA)
- Anchors: UPC, HSC, Frat Row / 28th St, Jefferson corridor, Figueroa
- Neighborhoods: K town, DTLA, Arcadia, San Gabriel, Santa Monica, Hollywood, Rowland Heights
- Transit: Union Station, LAX

**Alias sourcing**: cross-reference the publicly downloadable USC Concept3D PDF
(`https://assets.concept3d.com/assets/1928/21004_2021_2D_Letter_Map.pdf`) for
canonical names and grid refs. For each alias, resolve lat/lng via Google
Geocoding with `"{canonical_name} USC, Los Angeles"` at alias-table creation
time, cached forever. The PDF is dated 2021-06, so spot-check for post-2021
renames (the DMC/VKC/CPA case was caught this way). When the founder flags a
new common student-used alias, add it with one Google Geocoding call and
commit the new entry.

Entry shape:

```ts
{
  canonical: "Frat Row",
  variants: ["frat row", "frat road", "28th st", "row"],
  lat: 34.022,
  lng: -118.286,
  neighborhood: "USC UPC / 28th St corridor",
}
```

Lookup: normalize input (lowercase, strip punctuation), linear scan across
canonical and variants. Input sets are small enough that this is fine.

## Geocode fallback

On alias miss:
1. **Fail closed for short uppercase acronyms** before calling the geocoder.
   If the input matches `^[A-Z]{2,5}$` (e.g. "MRF", "KAP", "JFF"), do NOT
   geocode, return `need_location`. Short acronyms geocode to random LA
   businesses that share letters (e.g. "MRF" might resolve to some random
   storefront in DTLA) and we have no way to verify. Unknown USC-internal
   acronyms belong in the alias table, not in Google's index.
2. Call Google Geocoding API with `"${input}, Los Angeles, CA"`.
3. If the result sits within the LA area bounding box (34.00 to 34.35 N,
   -118.70 to -118.00 W), cache forever and return.
4. If the result is outside LA area, return `need_location`. Do not follow a
   geocoder to Boston just because it found a street with the same name.
5. Both hits and misses are cached. Misses cached shorter (1 day) so we retry
   eventually.

## Caching

Two LRU caches in the Google Maps service:

- `geocodeCache`: key = normalized query string, TTL 30 days, cap 500.
- `apiCache`: key = stringified params (matrix and places), TTL 1 hour, cap 1000.

In process memory. Empties on restart. Good enough at current volume.
Redis later when we run more than one agent instance.

## Cost envelope

Google Maps Platform billing switched in March 2025 from a blanket $200
monthly credit to per-SKU monthly free allowances. The SKUs we use:

- **Geocoding API**: 10,000 free / month, then $5 / 1000
- **Places API Nearby Search (New)**: 5,000 free / month, then $32 / 1000
- **Compute Route Matrix (Routes API)**: 10,000 elements free / month,
  then $5 / 1000 elements. Use this instead of the legacy Distance Matrix
  API; Distance Matrix is deprecated for new projects.

At current BIA traffic (single-digit conversations per hour):

| SKU | Free allowance | Projected monthly usage | Overage |
|---|---|---|---|
| Geocoding | 10,000 | ~100 | $0 |
| Places Nearby | 5,000 | ~3,000 | $0 |
| Compute Route Matrix | 10,000 elements | ~15,000 elements | ~$25 |

Total projected: **~$25/month overage** on Compute Route Matrix only. The
earlier `find_places_near` "5-candidate cap for cost reasons" no longer
applies under per-SKU billing; the cap is still useful for latency and
output quality but is not load-bearing for cost.

Alert at **$50/month actual spend** (down from the old $150 threshold,
since total expected overage is ~$25). Anything above that is a traffic
anomaly worth investigating.

**Migration note**: the Phase 1 plan currently calls the legacy Distance
Matrix API. Before ship, migrate the client to Routes API's
`computeRouteMatrix` endpoint. The request shape is slightly different
(origins / destinations wrap into `routeMatrix` structs, routing preferences
are named fields rather than query params) but the semantics are identical
for our use case.

## Error handling

Five distinct error paths, all surface as tool output, never as exceptions:

1. `GOOGLE_MAPS_API_KEY` missing: tools return `{ error: "geo_disabled" }` and
   the sub agent falls back to `campus_knowledge` prose retrieval. One startup
   warning log so we know.
2. Origin or destination unresolvable: `{ error: "need_location" }`. Campus
   sub agent asks the student "你现在在哪 / 你住哪边" and retries.
3. API timeout (3 second per call), single 500ms retry, then
   `{ error: "geo_unavailable" }`. Sub agent says something like "地图这会儿
   抽风了" and falls back to prose.
4. Billing block or rate limit: `{ error: "geo_unavailable" }` with a dedicated
   log event `google_maps_billing_blocked` so ops can rotate the key.
5. **Per-student budget exceeded**: `{ error: "geo_budget_exceeded" }`. George
   falls back to prose. See Per-student rate limit below.

All five error bodies are small so they do not bloat context through the in
turn tool result loop. `truncateToolResult` (the 1500 char cap already in
`context-window.ts`) applies.

## Per-student rate limit

The existing `checkRateLimit` in `adapters/rate-limiter.js` caps messages per
student, but a single message can trigger up to 12 sub-agent iterations,
each of which may call a geo tool. One student hammering "is X walkable"
for an hour could burn ~$50 of Google spend without touching the
per-message limit.

Add a second limiter: per-student per-hour cap on combined geo-tool calls
(`travel_time` + `find_places_near`). Default 30 calls / hour / student.

Implementation: a small token-bucket keyed on `studentId`, checked inside
`places.ts` before each Google call. If over budget, return
`{ error: "geo_budget_exceeded" }` without hitting Google. Log the breach
once per student per hour (`geo_budget_exceeded_for_student`) so we can
spot abuse. Bucket is in-process memory; fine at current scale, move to
Redis if we run multiple agent instances.

## Prompt changes

`VOICE_CALIBRATION.campus` gets four new hard rules:
- Never claim walking distance without calling `travel_time` first. K town,
  626, DTLA are drive only from USC.
- If origin is not clear from conversation, ask "你在哪边 / 你住哪" before
  calling geo tools. Never default to UPC.
- **Anaphora on origin**: if the student says "这里 / 这边 / here / my place"
  and there is no prior location anchor in the conversation, treat origin
  as unknown and ask. Do not silently assume UPC or the last sender-profile
  field. If there IS a prior anchor within the last few turns (e.g. student
  said "我住 Parkside" two messages ago), resolve "here" to that anchor and
  proceed.
- After 8pm, recommendations inside the DPS safety circle (8pm to 3am free
  share Lyft zone) get priority. Nightlife outside the zone gets a Lyft nudge.

`DOMAIN_EXPERTISE.campus` gets a Geo tools section describing when to reach
for each of the two tools and how to combine with `campus_knowledge`.

`SUB_AGENT_TOOLS`:
- `campus`: add both `travel_time` and `find_places_near` (primary consumer)
- `housing`: add `travel_time` only (apartment walkability)
- `event`: add `travel_time` only (event venue travel time)
- `course`, `social`: unchanged

The `need_location` error pattern is codified in the campus system prompt so
George does not editorialize its way around it.

## Testing

Unit, in `tests/services/`:
- `usc-aliases.test.ts`: canonical and variant lookups resolve correctly, all
  ~38 entries present, unknown input returns null.
- `google-maps.test.ts`: mock `fetch`, verify Geocoding / Places / Distance
  Matrix request shapes, LRU hit vs miss, timeout behavior, retry behavior,
  fallback error shapes.

Integration, in `tests/tools/`:
- `places.test.ts`: mock the `google-maps` service, verify the two tools
  return the correct shape for happy path, `need_location`, `geo_disabled`,
  `geo_unavailable`.

Voice regression, extend `tests/tools/personality.test.ts`:
- `getSubAgentPrompt("campus")` contains each of the three new hard rules.
- `getToolsByNames(SUB_AGENT_TOOLS.campus)` includes both new tools.

Manual smoke tests post deploy:
- "K town 能走吗" → walking time >= 20 min, `walkable: false`.
- "Parkside 附近好吃的" → nearby options with walking times.
- "我现在在 Doheny, 最近的咖啡" → uses Doheny as origin.
- Ambiguous origin ("where should I eat") → triggers "你在哪" follow up.

## Rollout phases

Phase 1: ship `travel_time` only. Alias table, geocode, distance matrix,
`travel_time` tool, campus + housing + event sub agent wiring, prompt rules
for "no walkable claim without tool call". Closes the K town bug directly.

Phase 2: ship `find_places_near` after Phase 1 is stable for a few days.
Places Nearby Search + ranking + campus_knowledge cross reference. Enables
proactive discovery.

Phase 3 (future, out of scope here): re rank Google POIs using BIA website
article ratings once the website is populated. Becomes the Beli style layer
the founder mentioned.

## Ops

- Add `GOOGLE_MAPS_API_KEY` to `.env.example`. Document required APIs
  (Geocoding, Places, Distance Matrix) in README.
- Billing alert at $150 on Google Cloud billing.
- Log events: `geo_disabled`, `geo_unavailable`, `google_maps_billing_blocked`,
  `google_maps_spend_exceeded`. All surface through the existing observability
  logger, so the monitor I already run picks them up.

## Security / ToS

- Do not persist Google Places results beyond the 30 day cache window. The
  30 day TTL on `geocodeCache` is at the max; `apiCache` at 1 hour is well
  under.
- Do not display arbitrary Google Places data to a student other than the
  student who triggered the query. The tools return data inline, the agent
  uses it, we do not persist per student.
- The `GOOGLE_MAPS_API_KEY` lives in `.env` (already gitignored). Restrict
  the key to IP or referrer on the Google Cloud console so a leak does not
  authorize anonymous callers.

## Out of scope

- Community rankings / Beli style curation. Deferred until BIA website has articles.
- Transit routing beyond Distance Matrix (no step by step directions).
- Persistent cross instance cache (Redis).
- Non Google providers. If cost becomes real we reassess.
- Safety circle enforcement beyond prompt rule, no hard geofence.
