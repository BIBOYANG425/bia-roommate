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
