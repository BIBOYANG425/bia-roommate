// Runs every tool_use block from an assistant response and returns tool_result
// blocks in the same order as the tool_use blocks. Anthropic's API requires
// tool_result ordering to match tool_use ordering in the subsequent user turn,
// so whatever execution strategy we pick, the returned array stays 1:1 with
// the input.

import Anthropic from '@anthropic-ai/sdk'
import { executeTool } from './tool-registry.js'
import { truncateToolResult } from './context-window.js'

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

  const results: Anthropic.Messages.ToolResultBlockParam[] = []

  for (const block of toolUses) {
    const input = block.input as Record<string, unknown>
    input.student_id = context.studentId
    if (!input.platform) input.platform = context.platform

    const raw = await executeTool(block.name, input)
    results.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: truncateToolResult(raw),
    })
  }

  return results
}
