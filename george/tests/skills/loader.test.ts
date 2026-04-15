import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parseSkillFile, walkSkillsDirectory } from '../../src/skills/loader.js'

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
