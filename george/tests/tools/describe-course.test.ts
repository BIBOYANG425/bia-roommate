import { describe, it, expect, beforeAll } from 'vitest'

describe('describe_course tool', () => {
  beforeAll(async () => {
    await import('../../src/tools/describe-course.js')
  })

  it('registers with the tool registry', async () => {
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    const tool = getToolDefinitions().find((t) => t.name === 'describe_course')
    expect(tool).toBeDefined()
    expect(tool?.input_schema.properties).toHaveProperty('dept')
    expect(tool?.input_schema.properties).toHaveProperty('code')
  })

  it('returns a not-found message when the course is missing', async () => {
    const { executeTool } = await import('../../src/agent/tool-registry.js')
    const result = await executeTool('describe_course', { dept: 'ZZZ', code: '999' })
    expect(result.toLowerCase()).toContain('not found')
  })
})
