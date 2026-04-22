import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'

const toolCallsMade: string[] = []

// Mock the Anthropic client so runSubAgent sees a canned 2-iteration exchange:
// iteration 1 -> two tool_use blocks; iteration 2 -> final text end_turn.
vi.mock('../../src/agent/llm-providers.js', () => {
  let callCount = 0
  return {
    getClaudeClient: vi.fn(() => ({
      messages: {
        create: vi.fn(async () => {
          callCount += 1
          if (callCount === 1) {
            return {
              content: [
                { type: 'tool_use', id: 'call_1', name: 'fake_query_a', input: { q: 'alpha' } },
                { type: 'tool_use', id: 'call_2', name: 'fake_query_b', input: { q: 'beta' } },
              ],
              stop_reason: 'tool_use',
            }
          }
          return {
            content: [{ type: 'text', text: '两个都查完了，结果在上面' }],
            stop_reason: 'end_turn',
          }
        }),
      },
    })),
  }
})

describe('runSubAgent multi-tool flow', () => {
  it('dispatches every tool_use block and stitches the final text reply', async () => {
    const { registerTool } = await import('../../src/agent/tool-registry.js')
    registerTool('fake_query_a', 'fake a', {}, async (input) => {
      toolCallsMade.push(`a:${input.q}`)
      return 'result-a'
    })
    registerTool('fake_query_b', 'fake b', {}, async (input) => {
      toolCallsMade.push(`b:${input.q}`)
      return 'result-b'
    })

    const { runSubAgent } = await import('../../src/agent/george.js')
    const history: Anthropic.Messages.MessageParam[] = []
    const response = await runSubAgent('campus', '帮我查一下 alpha 和 beta', history, {
      memories: [],
      isOnboarding: false,
      isFirstContact: false,
      onboardingTurnCount: 0,
      referralCount: 0,
      studentId: 'stu-integration',
      platform: 'imessage',
    })

    expect(response).toContain('两个都查完了')
    expect(toolCallsMade).toEqual(
      expect.arrayContaining(['a:alpha', 'b:beta']),
    )
    expect(toolCallsMade).toHaveLength(2)
  })
})
