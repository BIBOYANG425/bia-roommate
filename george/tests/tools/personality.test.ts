import { describe, it, expect } from 'vitest'
import {
  getSubAgentPrompt,
  getSubAgentPromptParts,
  getCurrentMood,
  SubAgent,
} from '../../src/agent/personality.js'
import { checkAntiPatterns } from '../../src/agent/bia-lore.js'

const ALL_AGENTS: SubAgent[] = ['event', 'course', 'housing', 'social', 'campus']

describe('George personality — BIA senior voice', () => {
  it('includes the George identity + BIA framing in all sub-agent prompts', () => {
    for (const agent of ALL_AGENTS) {
      const prompt = getSubAgentPrompt(agent)
      expect(prompt).toContain('George')
      expect(prompt).toContain('BIA')
      expect(prompt).toContain('USC')
    }
  })

  it('is NOT framed as a ghost dog (ghost-dog persona is removed)', () => {
    for (const agent of ALL_AGENTS) {
      const prompt = getSubAgentPrompt(agent)
      expect(prompt).not.toMatch(/ghost dog/i)
      expect(prompt).not.toContain('MBTI')
      expect(prompt).not.toContain('Peeves')
      expect(prompt).not.toContain('皮皮鬼')
      expect(prompt).not.toContain('1940')
    }
  })

  it('includes sub-agent-specific voice calibration', () => {
    expect(getSubAgentPrompt('event')).toContain('Voice calibration: Events')
    expect(getSubAgentPrompt('course')).toContain('Voice calibration: Courses')
    expect(getSubAgentPrompt('housing')).toContain('Voice calibration: Housing')
    expect(getSubAgentPrompt('social')).toContain('Voice calibration: Social')
    expect(getSubAgentPrompt('campus')).toContain('Voice calibration: Campus')
  })

  it('injects the BIA lore pack (neighborhoods, signature phrases, pain points)', () => {
    const prompt = getSubAgentPrompt('housing')
    expect(prompt).toContain('别让室友变室敌')
    expect(prompt).toContain('University Park')
    expect(prompt).toContain('Koreatown')
    expect(prompt).toContain('作息不同')
  })

  it('returns a valid mood', () => {
    const mood = getCurrentMood()
    expect(['excited', 'grumpy', 'playful', 'nostalgic', 'normal']).toContain(mood.name)
    expect(mood.instruction).toBeTruthy()
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

describe('getSubAgentPromptParts — static / dynamic split', () => {
  it('returns both parts and static includes the cacheable blocks', () => {
    const { static: staticPart, dynamic } = getSubAgentPromptParts('housing')
    expect(staticPart).toContain('George')
    expect(staticPart).toContain('Voice calibration: Housing')
    expect(staticPart).toContain('Koreatown')
    expect(dynamic).toContain('Current context')
  })

  it('moves mood into the dynamic part, not the static part', () => {
    const { static: staticPart, dynamic } = getSubAgentPromptParts('event')
    expect(dynamic).toContain('Mood:')
    expect(staticPart).not.toContain('Mood:')
  })

  it('onboarding context lands in the dynamic part', () => {
    const { dynamic } = getSubAgentPromptParts('campus', {
      isOnboarding: true,
      isFirstContact: true,
    })
    expect(dynamic).toContain('FIRST CONTACT')
  })

  it('static part is identical across calls with the same agent + skillCatalog', () => {
    const a = getSubAgentPromptParts('course').static
    const b = getSubAgentPromptParts('course').static
    expect(a).toBe(b)
  })
})

describe('Prompt anti-pattern sanity — George prompts themselves should not trigger false positives', () => {
  // The prompt itself contains example AI-slop phrases as negative samples.
  // We don't assert the prompt is clean — users' *responses* are what we lint.
  // But we DO assert the prompt doesn't accidentally reintroduce ghost-dog
  // phrasings that PR 3 is supposed to have killed.
  it('prompt does not contain ghost-dog device phrasings as positive instructions', () => {
    for (const agent of ALL_AGENTS) {
      const prompt = getSubAgentPrompt(agent)
      // 穿墙 / 嗅嗅 / 偷听 / 皮皮鬼 must not appear as active instructions.
      // (They may appear in ANTI_PATTERNS context or example-bad blocks — that's fine.)
      expect(prompt).not.toMatch(/让我嗅嗅|我刚.*穿墙|我.*偷听到/)
    }
  })
})

describe('checkAntiPatterns on sample outputs (integration with bia-lore)', () => {
  it('detects AI slop in a sample bad output', () => {
    const bad = 'As an AI, I hope this helps! Feel free to let me know if you have questions.'
    const hits = checkAntiPatterns(bad)
    expect(hits.length).toBeGreaterThan(0)
  })

  it('passes a sample good BIA-voice output', () => {
    const good = 'K-town 性价比高，$700-1000 单间能拿下。注意 6th St 以南别住。你有车吗？'
    const hits = checkAntiPatterns(good)
    expect(hits).toEqual([])
  })
})
