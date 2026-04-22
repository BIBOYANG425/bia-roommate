import { describe, expect, it } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { executeToolUseBlocks } from '../../src/agent/tool-executor.js'
import { registerTool } from '../../src/agent/tool-registry.js'

function toolUse(
  id: string,
  name: string,
  input: Record<string, unknown> = {},
): Anthropic.Messages.ToolUseBlock {
  return { type: 'tool_use', id, name, input } as Anthropic.Messages.ToolUseBlock
}

describe('executeToolUseBlocks', () => {
  it('returns an empty array when content has no tool_use blocks', async () => {
    const results = await executeToolUseBlocks(
      [{ type: 'text', text: 'hi', citations: null }] as Anthropic.Messages.ContentBlock[],
      { studentId: 's', platform: 'imessage' },
    )
    expect(results).toEqual([])
  })

  it('returns tool_result blocks in the same order as tool_use blocks', async () => {
    registerTool('order_a', 'returns a', {}, async () => 'A')
    registerTool('order_b', 'returns b', {}, async () => 'B')
    registerTool('order_c', 'returns c', {}, async () => 'C')

    const blocks = [
      toolUse('t1', 'order_a'),
      toolUse('t2', 'order_b'),
      toolUse('t3', 'order_c'),
    ] as Anthropic.Messages.ContentBlock[]

    const results = await executeToolUseBlocks(blocks, {
      studentId: 's',
      platform: 'imessage',
    })

    expect(results.map((r) => r.tool_use_id)).toEqual(['t1', 't2', 't3'])
    expect(results.map((r) => r.content)).toEqual(['A', 'B', 'C'])
  })

  it('injects student_id and falls back to context platform when not provided', async () => {
    let captured: Record<string, unknown> | null = null
    registerTool('capture_input', 'echo input', {}, async (input) => {
      captured = { ...input }
      return 'ok'
    })

    await executeToolUseBlocks(
      [toolUse('t', 'capture_input', { q: 'hi' })] as Anthropic.Messages.ContentBlock[],
      { studentId: 'stu-123', platform: 'wechat' },
    )

    expect(captured).toMatchObject({ q: 'hi', student_id: 'stu-123', platform: 'wechat' })
  })

  it('keeps the platform set by the model instead of overriding it', async () => {
    let captured: Record<string, unknown> | null = null
    registerTool('capture_platform', 'echo', {}, async (input) => {
      captured = { ...input }
      return 'ok'
    })

    await executeToolUseBlocks(
      [toolUse('t', 'capture_platform', { platform: 'wechat' })] as Anthropic.Messages.ContentBlock[],
      { studentId: 's', platform: 'imessage' },
    )

    expect(captured?.platform).toBe('wechat')
  })

  it('truncates long tool outputs via truncateToolResult', async () => {
    const longOutput = 'x'.repeat(5000)
    registerTool('long_output', 'long', {}, async () => longOutput)

    const results = await executeToolUseBlocks(
      [toolUse('t', 'long_output')] as Anthropic.Messages.ContentBlock[],
      { studentId: 's', platform: 'imessage' },
    )

    const content = results[0].content as string
    expect(content.length).toBeLessThan(longOutput.length)
  })

  it('ignores non tool_use blocks interleaved with tool_use blocks', async () => {
    registerTool('keep_me', 'keep', {}, async () => 'kept')

    const blocks = [
      { type: 'text', text: 'prelude', citations: null },
      toolUse('t', 'keep_me'),
      { type: 'text', text: 'postlude', citations: null },
    ] as Anthropic.Messages.ContentBlock[]

    const results = await executeToolUseBlocks(blocks, {
      studentId: 's',
      platform: 'imessage',
    })

    expect(results).toHaveLength(1)
    expect(results[0].tool_use_id).toBe('t')
  })

  it('runs tool_use blocks concurrently rather than sequentially', async () => {
    const TOOL_DURATION_MS = 400
    registerTool('slow_concurrent_a', 'slow a', {}, async () => {
      await new Promise((r) => setTimeout(r, TOOL_DURATION_MS))
      return 'A'
    })
    registerTool('slow_concurrent_b', 'slow b', {}, async () => {
      await new Promise((r) => setTimeout(r, TOOL_DURATION_MS))
      return 'B'
    })
    registerTool('slow_concurrent_c', 'slow c', {}, async () => {
      await new Promise((r) => setTimeout(r, TOOL_DURATION_MS))
      return 'C'
    })

    const blocks = [
      toolUse('t1', 'slow_concurrent_a'),
      toolUse('t2', 'slow_concurrent_b'),
      toolUse('t3', 'slow_concurrent_c'),
    ] as Anthropic.Messages.ContentBlock[]

    const start = Date.now()
    const results = await executeToolUseBlocks(blocks, {
      studentId: 's',
      platform: 'imessage',
    })
    const elapsed = Date.now() - start

    // Sequential execution would take 3 * TOOL_DURATION_MS (1200ms). Concurrent
    // execution should take ~TOOL_DURATION_MS (400ms). Cap at 2x the single-call
    // duration to leave headroom for slow CI without masking a regression to serial.
    expect(elapsed).toBeLessThan(TOOL_DURATION_MS * 2)
    expect(results.map((r) => r.content)).toEqual(['A', 'B', 'C'])
  })

  it('returns an error string when a tool handler rejects, without losing siblings', async () => {
    registerTool('ok_tool', 'ok', {}, async () => 'OK')
    registerTool('boom_tool', 'boom', {}, async () => {
      throw new Error('kaboom')
    })

    const blocks = [
      toolUse('t1', 'ok_tool'),
      toolUse('t2', 'boom_tool'),
    ] as Anthropic.Messages.ContentBlock[]

    const results = await executeToolUseBlocks(blocks, {
      studentId: 's',
      platform: 'imessage',
    })

    expect(results).toHaveLength(2)
    expect(results[0].content).toBe('OK')
    expect(typeof results[1].content === 'string' && results[1].content).toMatch(/boom_tool|kaboom|failed/i)
  })
})
