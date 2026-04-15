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
