import { describe, it, expect } from 'vitest'
import { getSubAgentPrompt, getCurrentMood, SubAgent } from '../../src/agent/personality.js'

describe('George personality', () => {
  it('includes character identity in all sub-agent prompts', () => {
    const agents: SubAgent[] = ['event', 'course', 'housing', 'social', 'campus']
    for (const agent of agents) {
      const prompt = getSubAgentPrompt(agent)
      expect(prompt).toContain('George Tirebiter')
      expect(prompt).toContain('ghost')
      expect(prompt).toContain('USC')
    }
  })
  it('event agent has HIGH mischief', () => {
    const prompt = getSubAgentPrompt('event')
    expect(prompt).toContain('HIGH MISCHIEF')
  })
  it('course agent has LOW mischief', () => {
    const prompt = getSubAgentPrompt('course')
    expect(prompt).toContain('LOW MISCHIEF')
  })
  it('returns a valid mood', () => {
    const mood = getCurrentMood()
    expect(['excited', 'grumpy', 'playful', 'nostalgic', 'normal']).toContain(mood.name)
    expect(mood.instruction).toBeTruthy()
  })
  it('includes BIA loyalty', () => {
    const prompt = getSubAgentPrompt('event')
    expect(prompt).toContain('BIA')
  })
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
})
