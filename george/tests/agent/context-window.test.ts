import { describe, expect, it, vi, beforeEach } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import {
  estimateTokens,
  estimateHistoryTokens,
  truncateToolResult,
  trimHistoryToBudget,
  summarizeDroppedHistory,
  HISTORY_TOKEN_BUDGET,
  TOOL_RESULT_MAX_CHARS,
} from '../../src/agent/context-window.js'

vi.mock('../../src/agent/llm-providers.js', () => ({
  getClaudeClient: vi.fn(() => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: '学生是Marshall大一新生，住Parkside，想了解BUAD 280。' }],
      })),
    },
  })),
}))

describe('estimateTokens', () => {
  it('counts plain string content', () => {
    expect(estimateTokens('hello world')).toBe(Math.ceil('hello world'.length / 2))
  })

  it('counts text blocks in array content', () => {
    const content: Anthropic.Messages.ContentBlock[] = [{ type: 'text', text: 'abcd' } as never]
    expect(estimateTokens(content as never)).toBe(2)
  })

  it('counts tool_use and tool_result blocks', () => {
    const content = [
      { type: 'tool_use', id: 'x', name: 'search_events', input: { q: 'city walk' } },
      { type: 'tool_result', tool_use_id: 'x', content: 'result payload here' },
    ] as never
    const tokens = estimateTokens(content)
    expect(tokens).toBeGreaterThan(0)
  })

  it('returns 0 for empty content array', () => {
    expect(estimateTokens([])).toBe(0)
  })
})

describe('estimateHistoryTokens', () => {
  it('sums across messages', () => {
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'abcd' },
      { role: 'assistant', content: 'efgh' },
    ]
    expect(estimateHistoryTokens(history)).toBe(4) // 2+2 with ratio 2
  })
})

describe('truncateToolResult', () => {
  it('leaves short results untouched', () => {
    expect(truncateToolResult('small', 100)).toBe('small')
  })

  it('cuts long results and marks truncation', () => {
    const long = 'a'.repeat(2000)
    const out = truncateToolResult(long, 500)
    expect(out.length).toBeLessThan(long.length)
    expect(out).toContain('[truncated: dropped')
  })

  it('prefers JSON boundary when present', () => {
    const json = `{"a":1},${'x'.repeat(2000)}`
    const out = truncateToolResult(json, 1500)
    expect(out).toContain('[truncated: dropped')
  })

  it('default cap matches export', () => {
    const long = 'x'.repeat(TOOL_RESULT_MAX_CHARS * 2)
    expect(truncateToolResult(long).length).toBeLessThan(long.length)
  })
})

describe('trimHistoryToBudget', () => {
  it('keeps all when under budget', () => {
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]
    const { kept, dropped } = trimHistoryToBudget(history, 100)
    expect(kept.length).toBe(3)
    expect(dropped.length).toBe(0)
  })

  it('drops oldest when over budget', () => {
    const big = 'x'.repeat(1000) // ~500 tokens
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: big }, // oldest, should drop
      { role: 'assistant', content: big }, // oldest, should drop
      { role: 'user', content: 'recent question' }, // newest, keep
      { role: 'assistant', content: 'recent answer' }, // newest, keep
    ]
    const { kept, dropped } = trimHistoryToBudget(history, 100)
    expect(kept.length).toBe(2)
    expect(dropped.length).toBe(2)
    expect(kept[0].content).toBe('recent question')
    expect(kept[1].content).toBe('recent answer')
  })

  it('keeps at least the most recent turn pair even if single msg exceeds budget', () => {
    const huge = 'x'.repeat(100_000) // ~50K tokens
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'old' },
      { role: 'assistant', content: 'old' },
      { role: 'user', content: huge },
      { role: 'assistant', content: huge },
    ]
    const { kept, dropped } = trimHistoryToBudget(history, 100)
    // Keep-floor: at least 2 messages (the latest pair) stays even when over.
    expect(kept.length).toBeGreaterThanOrEqual(2)
    expect(dropped.length).toBe(history.length - kept.length)
  })

  it('returns empty when history is empty', () => {
    const { kept, dropped } = trimHistoryToBudget([], 100)
    expect(kept).toEqual([])
    expect(dropped).toEqual([])
  })

  it('uses exported default budget when not specified', () => {
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'tiny' },
      { role: 'assistant', content: 'tiny' },
    ]
    const { kept } = trimHistoryToBudget(history)
    expect(kept.length).toBe(2)
    expect(HISTORY_TOKEN_BUDGET).toBeGreaterThan(0)
  })
})

describe('summarizeDroppedHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for empty input', async () => {
    const result = await summarizeDroppedHistory([])
    expect(result).toBeNull()
  })

  it('returns trimmed summary text from the LLM', async () => {
    const dropped: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: '我是Marshall大一' },
      { role: 'assistant', content: '包的，学长带你' },
    ]
    const result = await summarizeDroppedHistory(dropped)
    expect(result).toContain('Marshall')
  })

  it('returns null when the LLM call throws', async () => {
    const { getClaudeClient } = await import('../../src/agent/llm-providers.js')
    vi.mocked(getClaudeClient).mockReturnValueOnce({
      messages: {
        create: vi.fn(async () => {
          throw new Error('API down')
        }),
      },
    } as never)
    const dropped: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hi' },
    ]
    const result = await summarizeDroppedHistory(dropped)
    expect(result).toBeNull()
  })
})
