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
