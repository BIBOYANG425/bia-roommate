# George Skill Pool — Design Doc

> **For Claude:** This is a design doc, not an implementation plan. After approval,
> `superpowers:writing-plans` turns this into the step-by-step build plan.

**Status:** Approved 2026-04-14
**Owner:** George Tirebiter AI companion (`.worktrees/george`)
**Drives:** Architectural addition to `george/src/agent/`

---

## Goal

Add a **skill pool** layer to George — a library of procedural playbooks that the agent and its sub-agents can retrieve at runtime to learn *when* and *how* to chain their existing tools. Skills sit between sub-agents (which have personalities and domains) and tools (which do atomic things). They tell George what good handling of a request looks like for recurring patterns, without hardcoding that knowledge into prompts or tool implementations.

## Non-goals

- Replacing the existing 5 sub-agents or the intent classifier
- Refactoring the 14 existing tools
- Database schema changes
- Skill versioning, hot-reload, A/B framework, or per-student permissioning
- Skill chaining (a skill calling another skill)
- Embedding-based retrieval (deferred until pool grows beyond ~30)

## Mental model

- **Tools** = atomic capabilities (search, read, write)
- **Skills** = procedural playbooks ("when X, do these steps with these tools")
- **Sub-agents** = personalities + domains (event, course, housing, social, campus)
- **Skill pool** = library both the orchestrator and sub-agents draw from per turn
- **Discovery** = Claude-Code-style: catalog of skill names+descriptions visible to the LLM, which calls a `load_skill` tool to fetch the body when a skill matches the situation

## Architecture

George gains a new layer between sub-agents and tools. A skill is a markdown file with YAML frontmatter. Two tiers:

- `george/src/skills/orchestrator/` — cross-cutting, always visible (safety, memory, onboarding)
- `george/src/skills/sub-agents/<event|course|housing|social|campus>/` — domain playbooks scoped to one sub-agent

At backend boot, a **skill loader** walks both directories, parses frontmatter, validates that every `tools:` reference is a registered tool, and builds an in-memory index. Each skill's one-line `description` feeds a compact **catalog** that gets injected into the active sub-agent's system prompt per turn.

When the LLM sees a situation a catalog line hints at, it calls `load_skill({ name })` — a new tool that returns the full markdown body as a tool result. The LLM follows the playbook using George's existing tools. The existing multi-agent architecture (intent classifier → sub-agent → tool-use loop) is preserved; skills become an additional capability *inside* the loop, not a replacement.

The refactor is **strictly additive**. Nothing about the 14 existing tools changes. Existing `personality.ts` prose tool lists and `george.ts` `SUB_AGENT_TOOLS` map stay. Rollback = remove the catalog injection and `load_skill` from the tool list. No data migration.

## Components

### File layout

```
george/src/skills/
├── index.ts                  # public API: loadAllSkills, getCatalogFor, getSkillBody
├── loader.ts                 # walks dirs, parses frontmatter, validates
├── types.ts                  # Skill interface
├── orchestrator/
│   ├── remember-preference.md
│   ├── safety-escalate.md
│   └── onboarding-check.md
└── sub-agents/
    ├── event/
    │   ├── hype-bia-event.md
    │   └── social-proof-attendee-list.md
    ├── course/
    │   └── diagnose-course-overload.md
    ├── housing/
    ├── social/
    │   └── match-roommate-consent-first.md
    └── campus/
        └── ghost-lore-tip.md
```

### Skill file shape

```markdown
---
name: hype-bia-event
description: Use when a student asks about events AND at least one BIA-owned event could match their interests. Turns a plain search result into a BIA-first hype pitch.
tier: sub-agent
sub_agent: event
tools: [search_events, get_event_details, suggest_connection]
---

When a student asks about events:

1. Call search_events filtered to source='bia' using their interests
2. If 0 BIA hits, do a broader search but explicitly note BIA has nothing this week
3. For any BIA hit, call get_event_details to pull sponsor/perks
4. Call suggest_connection to find 1–2 friends going (social proof)
5. Respond in George's voice: lead with the BIA event, mention friends attending, end with a mischievous dare
```

Frontmatter fields:

- **`name`** — unique ID, must match filename stem
- **`description`** — one-line catalog hook; what the LLM pattern-matches against
- **`tier`** — `orchestrator` (global) or `sub-agent` (scoped)
- **`sub_agent`** — required when `tier: sub-agent`; one of event/course/housing/social/campus
- **`tools`** — array of tool names this skill references; validated at load time

### Public API (`skills/index.ts`)

- `loadAllSkills()` — walks both directories at boot, parses each `.md`, validates against the tool registry, throws on malformed frontmatter or unknown tool refs (errors aggregated so devs see all problems at once)
- `getCatalogFor(subAgent: SubAgent): string` — returns compact catalog (orchestrator skills + sub-agent-scoped skills) formatted for prompt injection. Deterministic order: orchestrator first, then sub-agent-specific
- `getSkillBody(name: string): string | null` — returns the markdown body (frontmatter stripped) for a named skill

### `load_skill` tool (`tools/load-skill.ts`)

```typescript
registerTool(
  'load_skill',
  'Load the full playbook for a skill by name. Use this when a skill description in the catalog matches the current situation — the returned markdown tells you exactly how to handle it.',
  { properties: { name: { type: 'string', description: 'The skill name from the catalog' } }, required: ['name'] },
  async (input) => getSkillBody(input.name as string) ?? `Unknown skill: ${input.name}`,
)
```

Registered globally like any other tool, imported by side effect from `george/src/index.ts`.

### Changes to existing files

- **`agent/personality.ts`** — `getSubAgentPrompt()` gains an optional `skillCatalog: string` param. If provided, it's appended as `## Skill Catalog` just before the mood block.
- **`agent/george.ts`** — `runSubAgent()` calls `getCatalogFor(agent)`, passes it into `getSubAgentPrompt()`, and adds `'load_skill'` to every sub-agent's tool name list. Also bumps `maxIterations` from 8 to 12 to account for the load_skill round-trip.
- **`index.ts`** (backend entry) — imports `./skills/index.js` and `./tools/load-skill.js` at boot, alongside the 14 existing tool imports.

### What does NOT change

- `intent-classifier.ts`
- `tool-registry.ts`
- `SUB_AGENT_TOOLS` map structure (only gets `'load_skill'` appended)
- The 14 existing tools
- Database schema
- Frontend / dev console

## Data flow

Per-turn sequence. New skill-layer steps marked 🆕.

```
1. processMessage() receives IncomingMessage
2. resolveStudentId, rate-limit, injection-check, link-code           (unchanged)
3. Parallel context loads (history, student, memories, referralCount) (unchanged)
4. classifyIntent → Intent                                            (unchanged)
5. Route: intent='general' || isOnboarding → 'campus' sub-agent       (unchanged)
6. runSubAgent(agent, text, history, context)
   🆕 6a. catalog = getCatalogFor(agent)
   🆕 6b. systemPrompt = getSubAgentPrompt(agent, { ..., skillCatalog: catalog })
   🆕 6c. toolNames = [...SUB_AGENT_TOOLS[agent], 'load_skill']
   7. Tool-use loop (existing, maxIterations bumped 8 → 12):
      while not end_turn:
        response = claude.messages.create({...})
        for tool_use in response.content:
          🆕 if name === 'load_skill': result = getSkillBody(input.name)
          else: result = await executeTool(name, input)
        push tool_results, continue
```

### Typical skill-using turn

Student: `"有什么好活动吗？"`

1. Intent classifier → `event`
2. System prompt for `event` sub-agent includes catalog with `hype-bia-event` listed
3. LLM iter 1: emits `tool_use { load_skill, hype-bia-event }`
4. Loop returns playbook body
5. LLM iter 2: emits `tool_use { search_events, source: 'bia' }` per playbook step 1
6. Loop returns events
7. LLM iter 3: emits `tool_use { get_event_details }` per step 3
8. LLM iter 4: emits `tool_use { suggest_connection }` per step 4
9. LLM iter 5: emits final text per step 5
10. `end_turn` → return text

~5 iterations vs current ~3 — hence the maxIterations bump from 8 to 12 for headroom.

### What if the LLM ignores the catalog

Skills are strictly additive. If nothing in the catalog matches, the LLM uses its existing tools directly the way it does today. Removing the catalog string and `load_skill` tool reverts George to current behavior with no data migration.

## Error handling

### Boot-time (loud, fail-fast)

`loadAllSkills()` aggregates errors and throws a single error mentioning all problems. Each is a developer bug, not a runtime condition.

| Failure | Behavior |
|---|---|
| Missing required frontmatter (`name`, `description`, `tier`) | Throw with file path + missing field |
| `name` doesn't match filename stem | Throw with both values |
| `tier: sub-agent` but no `sub_agent` field | Throw |
| `sub_agent` value not in valid set | Throw with valid values |
| `tools:` references a tool not in the registry | Throw with skill name + bad tool name |
| Two skills with same `name` | Throw with both file paths |
| YAML parse error | Throw with file path + parser error |

### Runtime (graceful, observable)

| Failure | Behavior |
|---|---|
| `load_skill` with unknown name | Returns `Unknown skill: <name>. Available skills: <list>`. LLM corrects or proceeds. |
| `load_skill` with no `name` arg | Returns missing-arg message. LLM corrects. |
| Skill loaded but instructions ignored | Logged at `info` (`skill_loaded_but_unused`); not an error |
| Same skill loaded twice in one turn | Returns body again (idempotent). Logged at `warn` (`skill_loaded_duplicate`) — usually means the playbook is too vague |
| Loop hits maxIterations (12) | Returns `FALLBACK_RESPONSE` (existing behavior). `loop_exhausted` log gets new field `loaded_skills: [...]` |
| `getSkillBody()` throws unexpectedly | Caught at the existing `executeTool` boundary. Tool returns `Tool load_skill failed: <message>`. Logged at `error`. |

### Observability additions

Three new structured log events on the existing `log()` helper:

- `skill_registry_loaded` — once at boot: `{ orchestratorCount, perSubAgent, totalCount }`
- `skill_loaded` — every successful load: `{ studentId, agent, skill, durationMs }`
- `skill_load_failed` — unknown name / missing arg / body throw: `{ studentId, agent, requestedName, reason }`

These ride the same logger powering `intent_classified` / `tool_executed` / `message_processed`.

## Testing

### Unit tests (`george/tests/skills/`)

**`loader.test.ts`** — boot-time validation:

- Valid fixture dir → asserts catalog count and lookup-by-name works
- Each error case from the boot-time table gets one test using a malformed fixture
- Aggregated error: two simultaneously broken files → asserted error mentions both

**`catalog.test.ts`** — per-sub-agent catalog builder:

- `getCatalogFor('event')` → all orchestrator + all event-tagged, none from other sub-agents
- Deterministic order (orchestrator first, then sub-agent)
- Empty case: sub-agent with zero domain skills still returns orchestrator section

**`load-skill-tool.test.ts`** — tool handler:

- Valid name → full markdown body, frontmatter stripped, body intact
- Unknown name → `Unknown skill` message with available list
- Missing `name` arg → missing-arg message
- Idempotent: two calls return identical strings

### Integration test (`george/tests/integration/skill-flow.test.ts`)

Mocks the Anthropic client with a deterministic script and `searchEvents()` with one fixture BIA event.

Script:

1. iter 1 → `tool_use { load_skill, hype-bia-event }`
2. iter 2 → `tool_use { search_events, source: 'bia' }`
3. iter 3 → text response

Asserts:

- System prompt for iter 1 contains `hype-bia-event`
- Skill body returned as tool_result before iter 2
- `search_events` called with `source='bia'`
- Final text matches iter 3's mock
- Three new log events emitted: `skill_loaded`, `tool_executed`, `message_processed`

### Manual smoke test

Real backend, real Claude, real Supabase. New section in `docs/manual-test-plan.md`:

1. Boot backend; confirm `skill_registry_loaded` log line with non-zero counts
2. Send `"我想找点活动"` (event intent) from `/george` dev console
3. Verify log sequence: `intent_classified=event` → `skill_loaded=hype-bia-event` → `tool_executed=search_events` → `message_processed`
4. Verify response: BIA event mentioned first, in voice
5. Send `"我感觉这学期课太多了"` (course overload trigger)
6. Expect `skill_loaded=diagnose-course-overload` → `tool_executed=plan_schedule`
7. Send `"hi"` (general / no skill match) — expect normal response, no `skill_loaded` event (proves additive)

If all 7 pass: ship.

### Not tested

- LLM behavior conformance (prompt-engineering iteration, not test)
- Catalog token counts (watch existing `message_processed durationMs` for regression)
- Skill content quality (PR review, not test suite)

## Initial skill set (ship with the refactor)

Six starter skills to validate the design end-to-end:

**Orchestrator (3):**

- `remember-preference` — silently extract a stable preference and call updateStudent / save memory
- `safety-escalate` — money/legal/mental-health questions get a safe handoff message
- `onboarding-check` — gate event/course/housing skills behind onboarding completion

**Sub-agent (3):**

- `event/hype-bia-event` — BIA-first event pitch (used in the integration test)
- `course/diagnose-course-overload` — workload analysis when a student feels stressed
- `social/match-roommate-consent-first` — roommate matching that respects social visibility flags

This gives every tier real coverage and lets the integration test exercise the full stack on a representative skill.

## Open questions deferred

- **Hot-reload** — currently requires backend restart. Add only if BIA contributors edit skills frequently.
- **Per-student permissioning / rollouts** — every student sees every skill. Add only when we want gradual rollout.
- **Embedding-based retrieval** — defer until pool exceeds ~30 skills per sub-agent.
- **Skill chaining** — LLM can sequentially load multiple skills; skills don't reference each other in their bodies.

## Risks

- **Iteration budget exhaustion** — skill-using turns add ~2 iterations. Mitigation: bump maxIterations 8→12. If still tight, skills can be more terse.
- **Prompt cache regression** — catalog injection changes the system prompt per sub-agent, but the catalog is *deterministic per sub-agent*, so the prompt cache should still hit. Watch `message_processed durationMs`.
- **Skill prose drift** — playbooks reference tools by name; if a tool is renamed or removed without updating skills, boot-time validation catches it. If a tool's *behavior* changes (e.g., `search_events` adds a required arg), the skill silently breaks. Mitigation: PR review for any tool signature change must check `george/src/skills/`.
- **LLM ignores catalog entirely** — possible if skill descriptions are too vague. Mitigation: log `skill_loaded_but_unused` events; iterate on prose.

## Next step

Invoke `superpowers:writing-plans` to turn this design into a step-by-step implementation plan with files, code blocks, and verification gates.
