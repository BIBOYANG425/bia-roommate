import { describe, it, expect } from 'vitest'

describe('Tool registry', () => {
  it('registers and retrieves tools', async () => {
    const { registerTool, getToolDefinitions } = await import(
      '../../src/agent/tool-registry.js'
    )
    registerTool(
      'test_tool',
      'A test tool',
      { properties: { q: { type: 'string' } } },
      async (input) => `result: ${input.q}`,
    )
    const tools = getToolDefinitions()
    const testTool = tools.find((t) => t.name === 'test_tool')
    expect(testTool).toBeDefined()
    expect(testTool!.description).toBe('A test tool')
  })

  it('executes registered tools', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('test_tool', { q: 'hello' })
    expect(result).toBe('result: hello')
  })

  it('returns error for unknown tools', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('nonexistent', {})
    expect(result).toContain('Unknown tool')
  })
})
