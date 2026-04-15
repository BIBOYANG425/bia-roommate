# George Skill Pool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Claude-Code-style skill pool to George — markdown playbooks the LLM retrieves at runtime via a `load_skill` tool when a catalog entry matches the situation.

**Architecture:** Strictly additive layer between sub-agents and tools. A skill loader walks `george/src/skills/orchestrator/` and `george/src/skills/sub-agents/<agent>/`, parses YAML frontmatter, validates against the tool registry. Each turn, the active sub-agent's system prompt gets a compact catalog injected, and `load_skill` is added to its tool list. Existing intent classifier, sub-agents, 14 tools, and database are unchanged.

**Tech Stack:** TypeScript (NodeNext, strict), Vitest, Express, `js-yaml` for frontmatter parsing, Anthropic Messages API. Backend runs in `george/` subdirectory of the worktree.

**Design doc:** `docs/plans/2026-04-14-george-skill-pool-design.md` (already committed). Read it before starting if you need the full mental model.

**Required reading before any task:**
- `george/src/agent/personality.ts` — current `getSubAgentPrompt()` shape
- `george/src/agent/george.ts:143-213` — current `runSubAgent()` tool-use loop
- `george/src/agent/tool-registry.ts` — `registerTool()` API
- `george/tests/tools/tool-registry.test.ts` — existing test style (vitest, dynamic import)

**Verification cadence:** After every task, run `cd george && npm test` and `cd george && npx tsc --noEmit`. Both must pass before committing. Commits should be small, focused, and use Conventional Commits format with `feat(george):` or `test(george):` prefix.

---

## Task 1: Install js-yaml and create the Skill type

**Why:** All later tasks depend on a typed `Skill` interface and a YAML parser. js-yaml is the canonical YAML library — small, well-maintained, used everywhere. No custom parser.

**Files:**
- Modify: `george/package.json` (via npm install)
- Create: `george/src/skills/types.ts`

**Step 1: Install js-yaml**

```bash
cd george && npm install js-yaml && npm install --save-dev @types/js-yaml
```

Expected: `package.json` gains `"js-yaml": "^4.x.x"` in dependencies and `"@types/js-yaml": "^4.x.x"` in devDependencies. Lockfile updates.

**Step 2: Create the types module**

Create `george/src/skills/types.ts`:

```typescript
import type { SubAgent } from '../agent/personality.js'

export type SkillTier = 'orchestrator' | 'sub-agent'

export interface Skill {
  /** Unique identifier; must match the filename stem (no extension). */
  name: string
  /** One-line catalog hook the LLM pattern-matches against. */
  description: string
  /** 'orchestrator' = always visible across all sub-agents; 'sub-agent' = scoped. */
  tier: SkillTier
  /** Required when tier === 'sub-agent'; one of event/course/housing/social/campus. */
  subAgent?: SubAgent
  /** Tool names this skill references; validated against the tool registry at load time. */
  tools: string[]
  /** Markdown body with frontmatter stripped. */
  body: string
  /** Absolute path to the source file (for error messages). */
  filePath: string
}
```

**Step 3: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 4: Commit**

```bash
cd george && git add package.json package-lock.json src/skills/types.ts
git commit -m "feat(george): add js-yaml dep and Skill type for skill pool"
```

---

## Task 2: Skill loader — parse one valid skill file (TDD happy path)

**Why:** Establish the parser before any validation logic. A single-file happy path proves frontmatter splitting and YAML parsing work, then we layer error cases on top.

**Files:**
- Create: `george/tests/skills/loader.test.ts`
- Create: `george/tests/skills/fixtures/valid/orchestrator/remember-preference.md`
- Create: `george/src/skills/loader.ts`

**Step 1: Write the failing test**

Create `george/tests/skills/loader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parseSkillFile } from '../../src/skills/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, 'fixtures')

describe('parseSkillFile', () => {
  it('parses a valid orchestrator skill', async () => {
    const path = join(FIXTURES, 'valid/orchestrator/remember-preference.md')
    const skill = await parseSkillFile(path)
    expect(skill.name).toBe('remember-preference')
    expect(skill.tier).toBe('orchestrator')
    expect(skill.subAgent).toBeUndefined()
    expect(skill.tools).toEqual(['lookup_student'])
    expect(skill.description).toContain('preference')
    expect(skill.body).toContain('Step 1')
    expect(skill.body).not.toContain('---')
    expect(skill.filePath).toBe(path)
  })
})
```

**Step 2: Create the fixture file**

Create `george/tests/skills/fixtures/valid/orchestrator/remember-preference.md`:

```markdown
---
name: remember-preference
description: When a student reveals a stable preference, save it silently
tier: orchestrator
tools: [lookup_student]
---

Step 1: Extract the preference key and value from the conversation
Step 2: Call lookup_student to confirm we have a record
Step 3: Save the memory; do not announce that you saved it
```

**Step 3: Run test to verify it fails**

```bash
cd george && npm test -- loader.test.ts
```

Expected: FAIL with module-not-found error on `parseSkillFile`.

**Step 4: Write minimal loader implementation**

Create `george/src/skills/loader.ts`:

```typescript
import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import yaml from 'js-yaml'
import type { Skill, SkillTier } from './types.js'
import type { SubAgent } from '../agent/personality.js'

const VALID_SUB_AGENTS: SubAgent[] = ['event', 'course', 'housing', 'social', 'campus']
const FRONTMATTER_DELIMITER = /^---\r?\n/

interface RawFrontmatter {
  name?: unknown
  description?: unknown
  tier?: unknown
  sub_agent?: unknown
  tools?: unknown
}

export async function parseSkillFile(filePath: string): Promise<Skill> {
  const raw = await readFile(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw, filePath)

  const fm = yaml.load(frontmatter) as RawFrontmatter
  if (!fm || typeof fm !== 'object') {
    throw new Error(`${filePath}: frontmatter is not a YAML object`)
  }

  const name = requireString(fm.name, 'name', filePath)
  const description = requireString(fm.description, 'description', filePath)
  const tier = requireString(fm.tier, 'tier', filePath) as SkillTier

  const expectedName = basename(filePath, extname(filePath))
  if (name !== expectedName) {
    throw new Error(
      `${filePath}: frontmatter name "${name}" does not match filename "${expectedName}"`,
    )
  }

  if (tier !== 'orchestrator' && tier !== 'sub-agent') {
    throw new Error(`${filePath}: tier must be 'orchestrator' or 'sub-agent', got "${tier}"`)
  }

  let subAgent: SubAgent | undefined
  if (tier === 'sub-agent') {
    const value = requireString(fm.sub_agent, 'sub_agent', filePath)
    if (!VALID_SUB_AGENTS.includes(value as SubAgent)) {
      throw new Error(
        `${filePath}: sub_agent must be one of ${VALID_SUB_AGENTS.join(', ')}, got "${value}"`,
      )
    }
    subAgent = value as SubAgent
  }

  const tools = requireStringArray(fm.tools, 'tools', filePath)

  return { name, description, tier, subAgent, tools, body, filePath }
}

function splitFrontmatter(raw: string, filePath: string): { frontmatter: string; body: string } {
  if (!FRONTMATTER_DELIMITER.test(raw)) {
    throw new Error(`${filePath}: file must start with '---' frontmatter delimiter`)
  }
  const afterFirst = raw.replace(FRONTMATTER_DELIMITER, '')
  const closeIndex = afterFirst.search(/^---\r?\n/m)
  if (closeIndex === -1) {
    throw new Error(`${filePath}: missing closing '---' frontmatter delimiter`)
  }
  const frontmatter = afterFirst.slice(0, closeIndex)
  const body = afterFirst.slice(closeIndex).replace(FRONTMATTER_DELIMITER, '').trim()
  return { frontmatter, body }
}

function requireString(value: unknown, field: string, filePath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${filePath}: frontmatter field "${field}" is required and must be a non-empty string`)
  }
  return value
}

function requireStringArray(value: unknown, field: string, filePath: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`${filePath}: frontmatter field "${field}" must be an array of strings`)
  }
  return value
}
```

**Step 5: Run test to verify it passes**

```bash
cd george && npm test -- loader.test.ts
```

Expected: PASS.

**Step 6: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 7: Commit**

```bash
cd george && git add tests/skills/loader.test.ts tests/skills/fixtures/ src/skills/loader.ts
git commit -m "feat(george): skill file parser with frontmatter validation"
```

---

## Task 3: Skill loader — error cases (TDD)

**Why:** Each malformed-file case from the design doc's boot-time errors table needs a fixture + test. We want all error paths covered before wiring the loader into boot.

**Files:**
- Modify: `george/tests/skills/loader.test.ts`
- Create: `george/tests/skills/fixtures/invalid/missing-name.md`
- Create: `george/tests/skills/fixtures/invalid/wrong-name.md`
- Create: `george/tests/skills/fixtures/invalid/missing-sub-agent.md`
- Create: `george/tests/skills/fixtures/invalid/bad-sub-agent.md`
- Create: `george/tests/skills/fixtures/invalid/no-frontmatter.md`
- Create: `george/tests/skills/fixtures/invalid/unclosed-frontmatter.md`
- Create: `george/tests/skills/fixtures/invalid/bad-tools.md`

**Step 1: Create the 7 invalid fixtures**

`george/tests/skills/fixtures/invalid/missing-name.md`:
```markdown
---
description: A skill without a name
tier: orchestrator
tools: [lookup_student]
---
body
```

`george/tests/skills/fixtures/invalid/wrong-name.md`:
```markdown
---
name: not-the-filename
description: Name does not match filename
tier: orchestrator
tools: [lookup_student]
---
body
```

`george/tests/skills/fixtures/invalid/missing-sub-agent.md`:
```markdown
---
name: missing-sub-agent
description: tier is sub-agent but no sub_agent field
tier: sub-agent
tools: [lookup_student]
---
body
```

`george/tests/skills/fixtures/invalid/bad-sub-agent.md`:
```markdown
---
name: bad-sub-agent
description: sub_agent value is not in the valid set
tier: sub-agent
sub_agent: nonsense
tools: [lookup_student]
---
body
```

`george/tests/skills/fixtures/invalid/no-frontmatter.md`:
```markdown
This file has no frontmatter at all.
```

`george/tests/skills/fixtures/invalid/unclosed-frontmatter.md`:
```markdown
---
name: unclosed-frontmatter
description: Missing closing delimiter

body without close
```

`george/tests/skills/fixtures/invalid/bad-tools.md`:
```markdown
---
name: bad-tools
description: tools field is a string instead of an array
tier: orchestrator
tools: lookup_student
---
body
```

**Step 2: Add failing tests**

Append to `george/tests/skills/loader.test.ts`:

```typescript
describe('parseSkillFile error cases', () => {
  const cases: Array<{ file: string; expectedError: RegExp }> = [
    { file: 'invalid/missing-name.md', expectedError: /name.*required/ },
    { file: 'invalid/wrong-name.md', expectedError: /does not match filename/ },
    { file: 'invalid/missing-sub-agent.md', expectedError: /sub_agent.*required/ },
    { file: 'invalid/bad-sub-agent.md', expectedError: /sub_agent must be one of/ },
    { file: 'invalid/no-frontmatter.md', expectedError: /must start with '---'/ },
    { file: 'invalid/unclosed-frontmatter.md', expectedError: /missing closing/ },
    { file: 'invalid/bad-tools.md', expectedError: /tools.*array of strings/ },
  ]

  for (const { file, expectedError } of cases) {
    it(`rejects ${file}`, async () => {
      const path = join(FIXTURES, file)
      await expect(parseSkillFile(path)).rejects.toThrow(expectedError)
    })
  }
})
```

**Step 3: Run tests to verify they pass**

The loader from Task 2 already throws the right errors — these tests should pass on first run since each error path has matching `Error()` calls in the loader.

```bash
cd george && npm test -- loader.test.ts
```

Expected: 8 tests PASS (1 from Task 2 + 7 new).

If any test fails, the loader's error message regex doesn't match — adjust the loader's error message, not the test's regex (the test asserts user-facing behavior).

**Step 4: Commit**

```bash
cd george && git add tests/skills/loader.test.ts tests/skills/fixtures/invalid/
git commit -m "test(george): cover skill loader error cases"
```

---

## Task 4: Skill loader — directory walk (TDD)

**Why:** Move from "parse one file" to "walk the two-tier directory structure and return all skills." This is what `loadAllSkills()` will call.

**Files:**
- Modify: `george/tests/skills/loader.test.ts`
- Modify: `george/src/skills/loader.ts`

**Step 1: Create more valid fixtures for the walk test**

Create `george/tests/skills/fixtures/valid/sub-agents/event/sample-event-skill.md`:

```markdown
---
name: sample-event-skill
description: Sample event-tier skill for the walk test
tier: sub-agent
sub_agent: event
tools: [search_events]
---
body
```

Create `george/tests/skills/fixtures/valid/sub-agents/course/sample-course-skill.md`:

```markdown
---
name: sample-course-skill
description: Sample course-tier skill for the walk test
tier: sub-agent
sub_agent: course
tools: [search_courses]
---
body
```

**Step 2: Add failing test**

Append to `george/tests/skills/loader.test.ts`:

```typescript
import { walkSkillsDirectory } from '../../src/skills/loader.js'

describe('walkSkillsDirectory', () => {
  it('walks the orchestrator + sub-agents directories', async () => {
    const valid = join(FIXTURES, 'valid')
    const skills = await walkSkillsDirectory(valid)
    const names = skills.map((s) => s.name).sort()
    expect(names).toEqual(['remember-preference', 'sample-course-skill', 'sample-event-skill'])
  })

  it('throws an aggregated error for multiple invalid files', async () => {
    const invalid = join(FIXTURES, 'invalid-walk')
    await expect(walkSkillsDirectory(invalid)).rejects.toThrow(/2 skill files failed to load/)
  })
})
```

**Step 3: Create the aggregated-error fixture set**

Create two broken files in a separate directory so the walk hits both:

`george/tests/skills/fixtures/invalid-walk/orchestrator/missing-name.md`:
```markdown
---
description: missing name
tier: orchestrator
tools: []
---
body
```

`george/tests/skills/fixtures/invalid-walk/orchestrator/wrong-name.md`:
```markdown
---
name: not-the-filename
description: wrong name
tier: orchestrator
tools: []
---
body
```

**Step 4: Run tests to verify they fail**

```bash
cd george && npm test -- loader.test.ts
```

Expected: FAIL with "walkSkillsDirectory is not exported".

**Step 5: Add the walker to the loader**

Append to `george/src/skills/loader.ts`:

```typescript
import { readdir, stat } from 'fs/promises'
import { join as pathJoin } from 'path'

export async function walkSkillsDirectory(rootDir: string): Promise<Skill[]> {
  const files: string[] = []
  await collectMarkdownFiles(rootDir, files)

  const skills: Skill[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      skills.push(await parseSkillFile(file))
    } catch (err) {
      errors.push((err as Error).message)
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} skill files failed to load:\n${errors.map((e) => '  - ' + e).join('\n')}`,
    )
  }

  return skills
}

async function collectMarkdownFiles(dir: string, out: string[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    const fullPath = pathJoin(dir, entry.name)
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, out)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(fullPath)
    }
  }
}
```

**Step 6: Run tests to verify they pass**

```bash
cd george && npm test -- loader.test.ts
```

Expected: 10 tests PASS (8 prior + 2 new).

**Step 7: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 8: Commit**

```bash
cd george && git add tests/skills/loader.test.ts tests/skills/fixtures/ src/skills/loader.ts
git commit -m "feat(george): walk skill directories and aggregate load errors"
```

---

## Task 5: Skill registry (catalog + getSkillBody + boot wrapper) (TDD)

**Why:** Loader returns raw skills; the registry holds them in a Map and exposes the public API the agent layer needs: catalog string per sub-agent, body lookup by name, and a `loadAllSkills()` that ties it all together with tool-registry validation.

**Files:**
- Create: `george/tests/skills/registry.test.ts`
- Create: `george/src/skills/index.ts`

**Step 1: Write the failing test**

Create `george/tests/skills/registry.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { buildRegistry, getCatalogFor, getSkillBody, _resetForTest } from '../../src/skills/index.js'
import { walkSkillsDirectory } from '../../src/skills/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, 'fixtures/valid')

describe('skill registry', () => {
  beforeAll(async () => {
    _resetForTest()
    const skills = await walkSkillsDirectory(FIXTURES)
    buildRegistry(skills, new Set(['lookup_student', 'search_events', 'search_courses']))
  })

  it('returns event-tier catalog with orchestrator + event-tagged skills', () => {
    const catalog = getCatalogFor('event')
    expect(catalog).toContain('## Skill Catalog')
    expect(catalog).toContain('remember-preference')
    expect(catalog).toContain('sample-event-skill')
    expect(catalog).not.toContain('sample-course-skill')
  })

  it('returns course-tier catalog with orchestrator + course-tagged skills', () => {
    const catalog = getCatalogFor('course')
    expect(catalog).toContain('remember-preference')
    expect(catalog).toContain('sample-course-skill')
    expect(catalog).not.toContain('sample-event-skill')
  })

  it('catalog lists orchestrator skills before sub-agent skills', () => {
    const catalog = getCatalogFor('event')
    const orchestratorIdx = catalog.indexOf('remember-preference')
    const subAgentIdx = catalog.indexOf('sample-event-skill')
    expect(orchestratorIdx).toBeGreaterThan(-1)
    expect(subAgentIdx).toBeGreaterThan(orchestratorIdx)
  })

  it('returns the body for a known skill, frontmatter stripped', () => {
    const body = getSkillBody('remember-preference')
    expect(body).not.toBeNull()
    expect(body).not.toContain('---')
    expect(body).toContain('Step 1')
  })

  it('returns null for an unknown skill', () => {
    expect(getSkillBody('does-not-exist')).toBeNull()
  })

  it('rejects buildRegistry when a skill references a missing tool', () => {
    _resetForTest()
    const fakeSkill = {
      name: 'broken',
      description: 'd',
      tier: 'orchestrator' as const,
      subAgent: undefined,
      tools: ['no_such_tool'],
      body: 'b',
      filePath: '/fake/path.md',
    }
    expect(() => buildRegistry([fakeSkill], new Set(['lookup_student']))).toThrow(/no_such_tool/)
  })

  it('rejects buildRegistry when two skills have the same name', () => {
    _resetForTest()
    const a = {
      name: 'dup',
      description: 'a',
      tier: 'orchestrator' as const,
      subAgent: undefined,
      tools: [],
      body: 'a',
      filePath: '/fake/a.md',
    }
    const b = { ...a, filePath: '/fake/b.md' }
    expect(() => buildRegistry([a, b], new Set())).toThrow(/duplicate skill name "dup"/)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd george && npm test -- registry.test.ts
```

Expected: FAIL with module-not-found on `src/skills/index.ts`.

**Step 3: Implement the registry**

Create `george/src/skills/index.ts`:

```typescript
import type { Skill } from './types.js'
import type { SubAgent } from '../agent/personality.js'
import { walkSkillsDirectory } from './loader.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const skillsByName = new Map<string, Skill>()
const orchestratorSkills: Skill[] = []
const subAgentSkills = new Map<SubAgent, Skill[]>()

export function _resetForTest(): void {
  skillsByName.clear()
  orchestratorSkills.length = 0
  subAgentSkills.clear()
}

export function buildRegistry(skills: Skill[], registeredTools: Set<string>): void {
  for (const skill of skills) {
    if (skillsByName.has(skill.name)) {
      const existing = skillsByName.get(skill.name)!
      throw new Error(
        `duplicate skill name "${skill.name}" in ${skill.filePath} and ${existing.filePath}`,
      )
    }
    for (const tool of skill.tools) {
      if (!registeredTools.has(tool)) {
        throw new Error(
          `${skill.filePath}: skill "${skill.name}" references unknown tool "${tool}"`,
        )
      }
    }
    skillsByName.set(skill.name, skill)
    if (skill.tier === 'orchestrator') {
      orchestratorSkills.push(skill)
    } else if (skill.subAgent) {
      const list = subAgentSkills.get(skill.subAgent) ?? []
      list.push(skill)
      subAgentSkills.set(skill.subAgent, list)
    }
  }
  orchestratorSkills.sort((a, b) => a.name.localeCompare(b.name))
  for (const list of subAgentSkills.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export function getCatalogFor(subAgent: SubAgent): string {
  const lines: string[] = ['## Skill Catalog']
  lines.push('When a situation matches one of these descriptions, call load_skill({ name }) to fetch the full playbook.')
  lines.push('')
  lines.push('Orchestrator (always available):')
  for (const s of orchestratorSkills) {
    lines.push(`- ${s.name}: ${s.description}`)
  }
  const list = subAgentSkills.get(subAgent) ?? []
  if (list.length > 0) {
    lines.push('')
    lines.push(`${subAgent}-specific:`)
    for (const s of list) {
      lines.push(`- ${s.name}: ${s.description}`)
    }
  }
  return lines.join('\n')
}

export function getSkillBody(name: string): string | null {
  return skillsByName.get(name)?.body ?? null
}

export function getRegistryStats(): {
  orchestratorCount: number
  perSubAgent: Record<string, number>
  totalCount: number
} {
  const perSubAgent: Record<string, number> = {}
  for (const [agent, list] of subAgentSkills.entries()) {
    perSubAgent[agent] = list.length
  }
  return {
    orchestratorCount: orchestratorSkills.length,
    perSubAgent,
    totalCount: skillsByName.size,
  }
}

/**
 * Boot-time entry: walks the production skills directory and builds the registry.
 * Call this once at server startup AFTER all tools have been registered.
 */
export async function loadAllSkills(registeredTools: Set<string>): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const skillsRoot = join(__dirname) // src/skills/
  const skills = await walkSkillsDirectory(skillsRoot)
  buildRegistry(skills, registeredTools)
}
```

**Step 4: Run tests to verify they pass**

```bash
cd george && npm test -- registry.test.ts
```

Expected: 7 tests PASS.

**Step 5: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 6: Commit**

```bash
cd george && git add tests/skills/registry.test.ts src/skills/index.ts
git commit -m "feat(george): skill registry with catalog + body lookup + tool validation"
```

---

## Task 6: `load_skill` tool (TDD)

**Why:** This is the surface the LLM uses to fetch skill bodies. Registers through the existing tool-registry API so it shows up in `getToolsByNames()` like any other tool.

**Files:**
- Create: `george/tests/skills/load-skill-tool.test.ts`
- Create: `george/src/tools/load-skill.ts`

**Step 1: Write the failing test**

Create `george/tests/skills/load-skill-tool.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'

describe('load_skill tool', () => {
  beforeAll(async () => {
    // Register a fake skill registry state
    const { _resetForTest, buildRegistry } = await import('../../src/skills/index.js')
    _resetForTest()
    buildRegistry(
      [
        {
          name: 'fake-skill',
          description: 'A fake skill for testing',
          tier: 'orchestrator',
          subAgent: undefined,
          tools: [],
          body: 'This is the body of the fake skill.',
          filePath: '/fake/fake-skill.md',
        },
      ],
      new Set(),
    )
    // Side-effect import registers the tool
    await import('../../src/tools/load-skill.js')
  })

  it('returns the skill body for a known name', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('load_skill', { name: 'fake-skill' })
    expect(result).toBe('This is the body of the fake skill.')
  })

  it('returns Unknown skill message for an unknown name', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('load_skill', { name: 'does-not-exist' })
    expect(result).toContain('Unknown skill')
    expect(result).toContain('does-not-exist')
  })

  it('returns missing-arg message when name is omitted', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('load_skill', {})
    expect(result).toContain("requires a 'name'")
  })

  it('is registered in the global tool registry', async () => {
    const { getToolsByNames } = await import('../../src/agent/tool-registry.js')
    const tools = getToolsByNames(['load_skill'])
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('load_skill')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd george && npm test -- load-skill-tool.test.ts
```

Expected: FAIL with module-not-found on `src/tools/load-skill.ts`.

**Step 3: Implement the tool**

Create `george/src/tools/load-skill.ts`:

```typescript
import { registerTool } from '../agent/tool-registry.js'
import { getSkillBody } from '../skills/index.js'

registerTool(
  'load_skill',
  'Load the full playbook for a skill by name. Use this when a skill description in the catalog matches the current situation — the returned markdown tells you exactly how to handle it.',
  {
    properties: {
      name: { type: 'string', description: 'The skill name from the catalog' },
    },
    required: ['name'],
  },
  async (input) => {
    const name = input.name
    if (typeof name !== 'string' || name.trim() === '') {
      return "load_skill requires a 'name' argument (string)."
    }
    const body = getSkillBody(name)
    if (body === null) {
      return `Unknown skill: ${name}. Check the catalog for the exact name.`
    }
    return body
  },
)
```

**Step 4: Run tests to verify they pass**

```bash
cd george && npm test -- load-skill-tool.test.ts
```

Expected: 4 tests PASS.

**Step 5: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 6: Commit**

```bash
cd george && git add tests/skills/load-skill-tool.test.ts src/tools/load-skill.ts
git commit -m "feat(george): load_skill tool for runtime skill discovery"
```

---

## Task 7: Wire skillCatalog into `getSubAgentPrompt()` (TDD)

**Why:** The catalog string needs to land inside the system prompt so the LLM sees the available skills. Adds a single optional parameter — minimally invasive.

**Files:**
- Modify: `george/src/agent/personality.ts:207-238` (the `getSubAgentPrompt` function)
- Modify: `george/tests/tools/personality.test.ts`

**Step 1: Add a failing test**

Append to `george/tests/tools/personality.test.ts`:

```typescript
  it('appends skill catalog when provided', () => {
    const catalog = '## Skill Catalog\n- test-skill: Use when testing'
    const prompt = getSubAgentPrompt('event', { skillCatalog: catalog })
    expect(prompt).toContain('## Skill Catalog')
    expect(prompt).toContain('test-skill')
  })

  it('omits skill catalog section when not provided', () => {
    const prompt = getSubAgentPrompt('event')
    expect(prompt).not.toContain('## Skill Catalog')
  })
```

**Step 2: Run test to verify it fails**

```bash
cd george && npm test -- personality.test.ts
```

Expected: FAIL — `## Skill Catalog` not present in prompt output.

**Step 3: Modify `getSubAgentPrompt`**

In `george/src/agent/personality.ts`, find the `getSubAgentPrompt` function (around line 207) and:

1. Add `skillCatalog?: string` to the `context` parameter type
2. Build a `skillCatalogSection` variable that's either empty or `\n${context.skillCatalog}\n`
3. Append it to the returned template, after the `referralBoost` section

The full updated function:

```typescript
export function getSubAgentPrompt(
  agent: SubAgent,
  context?: {
    memories?: Array<{ key: string; value: string; category: string }>
    isOnboarding?: boolean
    referralCount?: number
    skillCatalog?: string
  },
): string {
  const mood = getCurrentMood()
  const mischief = MISCHIEF[agent]
  const domain = DOMAIN_EXPERTISE[agent]
  const memoryCtx = context?.memories ? buildMemoryContext(context.memories) : ''
  const onboardingCtx = context?.isOnboarding ? ONBOARDING_PROMPT : ''

  let referralBoost = ''
  if (context?.referralCount && context.referralCount >= 10) {
    referralBoost = '\n## SECRET CAMPUS LORE MODE UNLOCKED\nThis student referred 10+ friends. Unlock secret campus lore mode — share more obscure campus facts, ghost stories, and hidden spots.\n'
  } else if (context?.referralCount && context.referralCount >= 3) {
    referralBoost = '\n## CHAOS MODE\nThis student referred 3+ friends. Be slightly more chaotic and mischievous than normal.\n'
  }

  const skillCatalogSection = context?.skillCatalog ? `\n${context.skillCatalog}\n` : ''

  return `${GEORGE_BASE}

## ${mischief.level}
${mischief.instruction}

${domain}

## Current Mood
${mood.instruction}
${memoryCtx}${onboardingCtx}${referralBoost}${skillCatalogSection}`
}
```

**Step 4: Run tests to verify they pass**

```bash
cd george && npm test -- personality.test.ts
```

Expected: ALL prior + 2 new tests PASS.

**Step 5: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 6: Commit**

```bash
cd george && git add src/agent/personality.ts tests/tools/personality.test.ts
git commit -m "feat(george): inject optional skill catalog into sub-agent prompt"
```

---

## Task 8: Wire catalog + load_skill into `runSubAgent()` and bump maxIterations

**Why:** This is the integration point. `runSubAgent` now builds the catalog, passes it into the prompt, and includes `load_skill` in every sub-agent's tool list. Bumps `maxIterations` from 8 to 12 to absorb the load_skill round-trip.

**Files:**
- Modify: `george/src/agent/george.ts`

**Step 1: Update imports and `SUB_AGENT_TOOLS`**

In `george/src/agent/george.ts`:

1. Add this import near the top with the other agent imports:

```typescript
import { getCatalogFor } from '../skills/index.js'
```

2. Append `'load_skill'` to every entry in `SUB_AGENT_TOOLS`:

```typescript
const SUB_AGENT_TOOLS: Record<SubAgent, string[]> = {
  event: ['search_events', 'get_event_details', 'set_reminder', 'submit_event', 'suggest_connection', 'lookup_student', 'load_skill'],
  course: ['search_courses', 'get_course_reviews', 'recommend_courses', 'plan_schedule', 'lookup_student', 'load_skill'],
  housing: ['search_sublets', 'post_sublet', 'lookup_student', 'load_skill'],
  social: ['suggest_connection', 'search_roommates', 'lookup_student', 'search_events', 'load_skill'],
  campus: ['campus_knowledge', 'lookup_student', 'load_skill'],
}
```

**Step 2: Update `runSubAgent`**

Replace the `getSubAgentPrompt(...)` call (around line 156) so it includes the catalog:

```typescript
  const skillCatalog = getCatalogFor(agent)
  const systemPrompt = getSubAgentPrompt(agent, {
    memories: context.memories,
    isOnboarding: context.isOnboarding,
    referralCount: context.referralCount,
    skillCatalog,
  })
```

**Step 3: Bump maxIterations**

Find `const maxIterations = 8` (around line 170) and change to:

```typescript
  const maxIterations = 12
```

**Step 4: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 5: Run all existing tests to make sure nothing broke**

```bash
cd george && npm test
```

Expected: all tests pass. The agent change is not directly unit-tested here — the integration test in Task 11 will exercise the full path.

**Step 6: Commit**

```bash
cd george && git add src/agent/george.ts
git commit -m "feat(george): wire skill catalog and load_skill into runSubAgent"
```

---

## Task 9: Boot wiring in `src/index.ts`

**Why:** The skill registry must be loaded at server startup *after* all 14 tools have registered themselves but *before* the first `/chat` request arrives. We also need to import the new `load_skill` tool by side effect.

**Files:**
- Modify: `george/src/index.ts:14-28` (tool imports + boot sequence)

**Step 1: Add the load_skill tool import**

In `george/src/index.ts`, just after the line `import './tools/submit-event.js'` (around line 28), add:

```typescript
import './tools/load-skill.js'
```

**Step 2: Load the skill registry at boot, before `app.listen`**

Find the line that starts the server (around `app.listen(config.port, ...)` near the end of the file). *Before* the server starts listening, add an async IIFE that loads the registry. The pattern:

```typescript
import { loadAllSkills, getRegistryStats } from './skills/index.js'
import { getToolDefinitions } from './agent/tool-registry.js'

// ... existing route definitions ...

async function startServer() {
  try {
    const toolNames = new Set(getToolDefinitions().map((t) => t.name))
    await loadAllSkills(toolNames)
    log('info', 'skill_registry_loaded', getRegistryStats())
  } catch (err) {
    log('error', 'skill_registry_load_failed', { error: (err as Error).message })
    throw err
  }

  app.listen(config.port, () => {
    log('info', 'server_started', { port: config.port, tools: 14, /* existing fields */ })
    console.log(`🐕 George Tirebiter is haunting port ${config.port}...`)
    // ... existing console output ...
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
```

You'll need to read the existing `app.listen(...)` block first to preserve its existing fields and console output. Read `george/src/index.ts` from line 200 to end before editing.

**Step 3: Typecheck**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 4: Smoke-test the boot sequence**

```bash
cd george && npm run dev
```

Expected (within ~3 seconds):
- A line `{"level":"info","event":"skill_registry_loaded","data":{"orchestratorCount":0,"perSubAgent":{},"totalCount":0}, ...}` (counts will be 0 until Task 10 adds the markdown files)
- A line `{"level":"info","event":"server_started","data":{"port":3001,"tools":15,...}, ...}` — note **15** tools now (14 existing + load_skill)
- The familiar `🐕 George Tirebiter is haunting port 3001...` console line

Stop the dev server with Ctrl+C.

If `skill_registry_load_failed` appears: read the error, fix the boot wiring, repeat. Common cause: importing `loadAllSkills` from the wrong path or running it before tool imports complete.

**Step 5: Commit**

```bash
cd george && git add src/index.ts
git commit -m "feat(george): boot skill registry after tool registration"
```

---

## Task 10: Author the 6 starter skill files

**Why:** Now we have plumbing but no skills. Add 3 orchestrator + 3 sub-agent skills so the registry is non-empty and the integration test (Task 11) has something real to load. These are markdown data files, no TDD — review the prose for quality at PR time.

**Files:**
- Create: `george/src/skills/orchestrator/remember-preference.md`
- Create: `george/src/skills/orchestrator/safety-escalate.md`
- Create: `george/src/skills/orchestrator/onboarding-check.md`
- Create: `george/src/skills/sub-agents/event/hype-bia-event.md`
- Create: `george/src/skills/sub-agents/course/diagnose-course-overload.md`
- Create: `george/src/skills/sub-agents/social/match-roommate-consent-first.md`

**Step 1: Create the orchestrator skills**

`george/src/skills/orchestrator/remember-preference.md`:
```markdown
---
name: remember-preference
description: Use when a student reveals a stable preference (favorite food, study spot, schedule pattern, dorm style, food restrictions). Save it silently for future turns.
tier: orchestrator
tools: [lookup_student]
---

When a student reveals a lasting preference about themselves:

1. Identify the preference key (e.g., "favorite_study_spot", "dietary_restriction", "preferred_event_type")
2. Identify the value as a short phrase (e.g., "Doheny library 3rd floor")
3. Call lookup_student to confirm we have a student record
4. Note the preference internally — the memory extractor job will persist it asynchronously
5. Do NOT announce that you saved the preference. Just use it naturally in the conversation.

A preference is stable if it would still be true next semester. "I'm hungry right now" is not a preference. "I'm vegetarian" is.
```

`george/src/skills/orchestrator/safety-escalate.md`:
```markdown
---
name: safety-escalate
description: Use when a student asks about money/financial transactions, legal/visa/immigration issues, mental health, or anything where a wrong answer could harm them. George should hand off, not improvise.
tier: orchestrator
tools: []
---

If a student asks about any of the following, do NOT improvise an answer:

- Money: tuition payment problems, scholarships, refunds, taxes, wire transfers
- Legal: visa status, OPT/CPT, immigration paperwork, contracts, lease disputes
- Mental health: feeling depressed, anxious, suicidal, isolated, in crisis
- Medical: health symptoms, prescriptions, insurance claims

Respond in George's voice but escalate clearly:

1. Acknowledge the issue with empathy ("听起来这事挺重要的")
2. Say you can't give advice on this in character ("我虽然在USC游荡了80年但是我不是律师/医生/心理医生")
3. Point them to the right human resource:
   - Money → BIA finance officer + USC Financial Aid
   - Legal/visa → OIS (Office of International Services) at usc.edu/ois
   - Mental health → USC Student Health Counseling at (213) 740-9355, available 24/7
   - Medical → USC Engemann Student Health Center

End the message gently. Do NOT make jokes about the topic itself.
```

`george/src/skills/orchestrator/onboarding-check.md`:
```markdown
---
name: onboarding-check
description: Use when a student tries to use event/course/housing/social features but hasn't completed onboarding. Politely redirect them to onboarding first.
tier: orchestrator
tools: [lookup_student]
---

If a student is mid-conversation about events, courses, housing, or social matching, but their `onboarding_complete` is false:

1. Call lookup_student to confirm onboarding status
2. If still incomplete, redirect playfully: "等等等等！我连你叫什么都不知道呢，先告诉我点关于你的事吧🐕"
3. Run through the onboarding questions one at a time (major, year, interests, social vs academic preference, notification frequency)
4. Once all 5 answers are collected, mark onboarding complete and THEN return to the original request

Never silently skip onboarding. The whole personalization layer depends on having student profile data.
```

**Step 2: Create the sub-agent skills**

`george/src/skills/sub-agents/event/hype-bia-event.md`:
```markdown
---
name: hype-bia-event
description: Use when a student asks about events AND at least one BIA-owned event could match their interests. Turns a plain search result into a BIA-first hype pitch.
tier: sub-agent
sub_agent: event
tools: [search_events, get_event_details, suggest_connection]
---

When a student asks about events:

1. Call search_events filtered to source='bia' using their interests as the query
2. If 0 BIA hits, do a broader search (no source filter) but explicitly note "BIA这周没有活动诶" before listing alternatives
3. For any BIA hit, ALSO call get_event_details to pull sponsor/perks/location details
4. Call suggest_connection to find 1-2 friends already going (social proof)
5. Respond in George's voice:
   - Lead with the BIA event
   - Mention the specific perks (free food, sponsor swag, etc.)
   - Drop the social proof ("X和Y已经报名了哦")
   - End with a mischievous dare ("你确定不去？上次不去的同学后悔了三天哦")

Do NOT mention non-BIA events before BIA events. George doesn't hedge. If multiple BIA events match, pick the soonest.
```

`george/src/skills/sub-agents/course/diagnose-course-overload.md`:
```markdown
---
name: diagnose-course-overload
description: Use when a student mentions feeling overwhelmed, stressed, drowning in work, or asks if their schedule is too heavy.
tier: sub-agent
sub_agent: course
tools: [plan_schedule, get_course_reviews]
---

When a student signals workload stress:

1. Call plan_schedule to pull their currently-enrolled courses for this term
2. For each course, call get_course_reviews and note the reported workload_hours
3. Sum the predicted workload across all courses
4. If total > 25 hrs/week predicted, flag overload
5. Identify the course with the worst hours-to-major-relevance ratio (lowest priority first)
6. Suggest dropping or replacing that course with something lighter
7. Respond in George's grumpy-but-caring voice ("我当年也死于一个bad schedule... 字面意义上死了")

If total is reasonable (<25 hrs), reassure them it's not the schedule, it might be the season — finals are coming, midterms just hit, etc. Reference the current mood block.
```

`george/src/skills/sub-agents/social/match-roommate-consent-first.md`:
```markdown
---
name: match-roommate-consent-first
description: Use when a student wants to find roommates or be matched with people. Always check social visibility settings before sharing any contact info.
tier: sub-agent
sub_agent: social
tools: [search_roommates, lookup_student]
---

When a student wants roommate matching:

1. Call lookup_student to check the requesting student's profile completeness AND social visibility flag
2. If their own profile is incomplete, ask them to fill it in first ("你自己的profile都没填，怎么让人家匹配你呀")
3. Call search_roommates with their preferences (budget, area, lifestyle)
4. For each match, ONLY share name + matching criteria — never WeChat ID, phone, or email
5. Tell the student the next step: "如果你想认识他们，告诉我，我去问问他们愿不愿意被介绍"
6. Do NOT auto-introduce. Each side must explicitly opt in via a future turn.

Privacy is sacred here. One leak destroys trust for the whole community.
```

**Step 3: Restart the dev server and confirm the registry loads them**

```bash
cd george && npm run dev
```

Expected log lines:
- `skill_registry_loaded` with `orchestratorCount: 3, perSubAgent: { event: 1, course: 1, social: 1 }, totalCount: 6`
- Server starts on port 3001 normally

Stop the server with Ctrl+C. If the registry fails to load, the error message will name the bad file — fix it and restart.

**Step 4: Commit**

```bash
cd george && git add src/skills/orchestrator/ src/skills/sub-agents/
git commit -m "feat(george): seed skill pool with 3 orchestrator + 3 sub-agent playbooks"
```

---

## Task 11: Integration test — full skill flow with mocked Anthropic (TDD)

**Why:** Catches the most likely regression (catalog drops out of the prompt, `load_skill` not registered, tool list missing `load_skill`) without needing the real LLM. Mocks the Anthropic client with a deterministic 3-iteration script.

**Files:**
- Create: `george/tests/skills/skill-flow.test.ts`

**Step 1: Read the existing `runSubAgent` source one more time**

```bash
cd george && cat src/agent/george.ts | head -220
```

You need to know exactly which Anthropic SDK methods are called so the mock can replace them with a stub.

**Step 2: Write the failing test**

Create `george/tests/skills/skill-flow.test.ts`:

```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest'

// We mock the Claude client BEFORE importing anything that uses it
const messagesCreate = vi.fn()
vi.mock('../../src/agent/llm-providers.js', () => ({
  getClaudeClient: () => ({
    messages: { create: messagesCreate },
  }),
  callLightweightLLM: vi.fn(async () => 'event'),
}))

// Mock Supabase-touching functions used inside processMessage
vi.mock('../../src/db/students.js', () => ({
  resolveStudentId: vi.fn(async () => 'test-student-id'),
  getStudentById: vi.fn(async () => ({
    id: 'test-student-id',
    onboarding_complete: true,
    referred_by: null,
  })),
  loadStudentMemories: vi.fn(async () => []),
  getReferralCount: vi.fn(async () => 0),
  updateStudent: vi.fn(async () => undefined),
  claimLinkCode: vi.fn(),
  generateLinkCode: vi.fn(),
}))

vi.mock('../../src/db/messages.js', () => ({
  loadRecentMessages: vi.fn(async () => []),
  saveMessage: vi.fn(async () => undefined),
}))

vi.mock('../../src/db/events.js', () => ({
  searchEvents: vi.fn(async () => [
    { id: 'evt-1', title: 'BIA x miHoYo Recruiting Night', date: '2026-04-18', location: 'Tutor Center', source: 'bia' },
  ]),
}))

vi.mock('../../src/jobs/memory-extraction.js', () => ({
  extractMemories: vi.fn(),
}))

vi.mock('../../src/security/injection-filter.js', () => ({
  checkInjection: () => ({ blocked: false, sanitized: undefined }),
  INJECTION_REJECTIONS: ['blocked'],
}))

vi.mock('../../src/adapters/rate-limiter.js', () => ({
  checkRateLimit: () => ({ allowed: true }),
  RATE_LIMIT_RESPONSE: 'rate limited',
}))

describe('skill flow integration', () => {
  beforeAll(async () => {
    // Register all real tools so load_skill validation succeeds
    await import('../../src/tools/search-events.js')
    await import('../../src/tools/get-event-details.js')
    await import('../../src/tools/suggest-connection.js')
    await import('../../src/tools/lookup-student.js')
    await import('../../src/tools/load-skill.js')

    // Build the registry from the production skills directory
    const { loadAllSkills } = await import('../../src/skills/index.js')
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    await loadAllSkills(new Set(getToolDefinitions().map((t) => t.name)))
  })

  it('runs hype-bia-event end to end via load_skill', async () => {
    let receivedSystem = ''
    messagesCreate
      .mockImplementationOnce(async (req) => {
        receivedSystem = req.system
        return {
          stop_reason: 'tool_use',
          content: [
            { type: 'tool_use', id: 'tu-1', name: 'load_skill', input: { name: 'hype-bia-event' } },
          ],
        }
      })
      .mockImplementationOnce(async () => ({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tu-2', name: 'search_events', input: { query: '招聘', category: 'career' } },
        ],
      }))
      .mockImplementationOnce(async () => ({
        stop_reason: 'end_turn',
        content: [
          { type: 'text', text: '汪！BIA x miHoYo招聘夜，错过的话我会笑你三天 👻' },
        ],
      }))

    const { processMessage } = await import('../../src/agent/george.js')
    const response = await processMessage({
      userId: 'test-user',
      platform: 'imessage',
      text: '有什么招聘活动吗？',
      msgType: 'text',
      timestamp: Date.now(),
    })

    // Skill catalog made it into the system prompt
    expect(receivedSystem).toContain('## Skill Catalog')
    expect(receivedSystem).toContain('hype-bia-event')

    // Three iterations happened
    expect(messagesCreate).toHaveBeenCalledTimes(3)

    // Final response matches the mocked end_turn text
    expect(response).toContain('miHoYo')
  })
})
```

**Step 3: Run test to verify it fails**

```bash
cd george && npm test -- skill-flow.test.ts
```

Expected: FAIL — likely a mock setup error first time. Iterate on the mocks until they all resolve and the assertions are the only failing piece.

**Step 4: Iterate until green**

Common failure modes and fixes:
- `processMessage` imports something not mocked → add the missing mock above
- `messagesCreate` not called → check the mock path matches `getClaudeClient` import in `george.ts`
- Catalog assertion fails → confirm Task 8 actually wired `getCatalogFor` into `runSubAgent`
- `tool_use` request shape mismatch → match the Anthropic SDK's exact response shape (`stop_reason`, `content` with `type` discriminator)

**Step 5: Run all tests to make sure nothing else broke**

```bash
cd george && npm test
```

Expected: every test PASS.

**Step 6: Commit**

```bash
cd george && git add tests/skills/skill-flow.test.ts
git commit -m "test(george): integration test for skill flow with mocked Claude"
```

---

## Task 12: Update manual test plan + manual smoke test

**Why:** Final gate before merging. Real backend, real Claude, real Supabase — verifies the whole stack hangs together in a way mocks can't.

**Files:**
- Modify: `docs/manual-test-plan.md`

**Step 1: Append a new section to the manual test plan**

Read the existing `docs/manual-test-plan.md` first to match its structure, then append:

```markdown
## Skill Pool Smoke Test

**Goal:** Verify the skill registry loads, the catalog reaches the LLM, and `load_skill` runs end-to-end against the real backend.

**Setup:**

1. `cd george && npm run dev`
2. Watch the boot logs for `skill_registry_loaded` with `orchestratorCount: 3, perSubAgent: { event: 1, course: 1, social: 1 }, totalCount: 6`
3. If the line is missing or counts are wrong, stop and fix the registry before continuing

**Test 1: Event skill triggers**

1. Open `http://localhost:3000/george`
2. Send: `我想找点活动`
3. Watch backend logs for the sequence:
   - `intent_classified intent=event`
   - `tool_executed tool=load_skill`
   - `tool_executed tool=search_events`
   - `message_processed`
4. Verify response leads with a BIA event and uses George's voice

**Test 2: Course overload skill triggers**

1. Send: `我感觉这学期课太多了`
2. Expect log sequence with `tool=load_skill` (skill name `diagnose-course-overload`) followed by `tool=plan_schedule`
3. Verify response acknowledges workload concerns in George's grumpy-caring voice

**Test 3: Skills are strictly additive (no regression)**

1. Send: `hi`
2. Expect normal greeting response
3. Logs should NOT contain `load_skill` (no skill matched, George responds directly)
4. This proves removing the skill layer would not break existing behavior

**Test 4: Boot validation catches a broken skill**

1. Stop the backend
2. Temporarily edit `src/skills/orchestrator/remember-preference.md` and remove the `name:` line
3. Run `npm run dev`
4. Expect `skill_registry_load_failed` log + process exit
5. Restore the file, restart, confirm normal boot

**Pass criteria:** All 4 tests behave as described.
```

**Step 2: Boot the backend**

```bash
cd george && npm run dev
```

Watch for `skill_registry_loaded`. If it's not there or counts are wrong, debug before continuing.

**Step 3: Run all 4 manual tests in the browser at `http://localhost:3000/george`**

Walk through each test from the new section. If any fail:
- Test 1 fails → check Task 8 wiring (catalog into runSubAgent) and Task 6 (load_skill tool registered)
- Test 2 fails → same as Test 1, plus check the skill markdown's tool list
- Test 3 fails → catalog or skill descriptions are too aggressive; LLM is loading skills it shouldn't. Tighten descriptions.
- Test 4 fails → loader's error path isn't aggregating properly; recheck Task 4

**Step 4: Stop the dev server**

Ctrl+C the dev server.

**Step 5: Commit the manual test plan update**

```bash
cd george && cd .. && git add docs/manual-test-plan.md
git commit -m "docs(george): manual smoke test for skill pool"
```

---

## Task 13: Final verification — full test suite + typecheck

**Why:** One last clean run before the work lands. If anything regressed silently during the manual smoke test, this catches it.

**Step 1: Run the full test suite**

```bash
cd george && npm test
```

Expected: every test PASS. Note the total count and compare to Task 11's count + the prior-session baseline.

**Step 2: Typecheck everything**

```bash
cd george && npx tsc --noEmit
```

Expected: exit code 0.

**Step 3: Lint check (root, since CI runs it)**

```bash
cd .. && npm run lint
```

Expected: exit code 0. If there are warnings about the new files, fix them and re-run.

**Step 4: Inspect git log to confirm task structure**

```bash
git log --oneline -15
```

You should see ~12 commits from this plan, in order, each prefixed `feat(george):`, `test(george):`, or `docs(george):`. Each commit should be small and focused.

**Step 5: If everything is green, you're done**

The skill pool is shipped and verified. Open a follow-up PR comment summarizing the new system and pointing reviewers to the design doc.

---

## Implementation notes

**Why TDD here:** The skill loader has many error paths and the catalog formatting is exactly the kind of thing that's easy to break by accident. The integration test catches the highest-impact regression (catalog falling out of the prompt) at near-zero cost.

**Why no test for `george.ts` wiring directly:** The tool-use loop is hard to unit-test in isolation (it's stateful, calls the LLM, threads context). The integration test in Task 11 covers the entire path including the wiring change. If that test passes, the wiring is correct.

**Why bump maxIterations from 8 to 12:** Skill-using turns add ~2 iterations (`load_skill` round-trip + skill-driven tool calls). At 8 iterations, a multi-tool skill could exhaust the budget and return `FALLBACK_RESPONSE`. 12 gives headroom without risking runaway loops. We can tune this later based on real `loop_exhausted` log frequency.

**Why orchestrator skills use `tools: []` when they're cross-cutting:** Skills declare the tools they reference in their *body*, not the universe of tools they could possibly need. `safety-escalate` doesn't call any tools — it just emits a response. `onboarding-check` only references `lookup_student` because that's the only tool the playbook explicitly says to call.

**Rollback:** If the skill layer causes problems in production, revert the four wiring changes (`personality.ts` param, `george.ts` catalog + tool list + maxIterations, `index.ts` boot) and George reverts to current behavior. The skill files and loader can stay — they'll just be inert. No data migration needed.

**Future: hot-reload, embeddings, A/B.** Listed in the design doc's "deferred" section. Not in scope for this plan.
