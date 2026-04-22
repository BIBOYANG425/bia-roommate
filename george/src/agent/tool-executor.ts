// Runs every tool_use block from an assistant response and returns tool_result
// blocks in the same order as the tool_use blocks. Anthropic's API requires
// tool_result ordering to match tool_use ordering in the subsequent user turn,
// so the returned array stays 1:1 with the input even though the underlying
// tool calls run in parallel.

import Anthropic from '@anthropic-ai/sdk'
import { executeTool } from './tool-registry.js'
import { truncateToolResult } from './context-window.js'
import { log } from '../observability/logger.js'

export interface ToolBatchContext {
  studentId: string
  platform: 'wechat' | 'imessage'
}

export async function executeToolUseBlocks(
  content: readonly Anthropic.Messages.ContentBlock[],
  context: ToolBatchContext,
): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
  const toolUses = content.filter(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
  )
  if (toolUses.length === 0) return []

  const batchStart = Date.now()
  const settled = await Promise.allSettled(
    toolUses.map((block) => {
      const input = block.input as Record<string, unknown>
      input.student_id = context.studentId
      if (!input.platform) input.platform = context.platform
      return executeTool(block.name, input)
    }),
  )

  log('info', 'parallel_tool_batch', {
    count: toolUses.length,
    durationMs: Date.now() - batchStart,
  })

  return toolUses.map((block, i) => {
    const settledResult = settled[i]
    const raw =
      settledResult.status === 'fulfilled'
        ? settledResult.value
        : `Tool ${block.name} failed: ${(settledResult.reason as Error).message ?? String(settledResult.reason)}`
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: truncateToolResult(raw),
    }
  })
}
