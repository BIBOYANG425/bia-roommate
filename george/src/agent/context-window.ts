/**
 * Conversation-context window management for George.
 *
 * Purpose:
 *  - Estimate message tokens (char-based; mixed zh/en register)
 *  - Trim history to a token budget, keeping the newest turn pair
 *  - Summarize dropped-oldest messages into a compact prose block (Haiku)
 *  - Truncate individual tool results so a verbose tool call doesn't bloat
 *    subsequent turns
 *
 * Why char-based estimation: good enough for trim decisions. Under-counts on
 * pure ASCII (ratio closer to 4 chars/token), over-counts on CJK (ratio closer
 * to 1.5). Conservative default errs on the safe side (trim earlier than
 * strictly needed) in return for no tokenizer dependency.
 *
 * Header last reviewed: 2026-04-17
 */
import Anthropic from '@anthropic-ai/sdk'
import { getClaudeClient } from './llm-providers.js'

// Mixed English/Chinese register — ~2.0 chars per token is a conservative
// middle-ground estimate (zh is ~1.5, en is ~4).
const CHARS_PER_TOKEN = 2.0

// History-only budget (excludes system prompt, tools, current user message).
// With Sonnet 4.6's 200K input, this leaves generous room for the cached
// system prompt (~8K), tool definitions, and in-turn tool-result growth.
export const HISTORY_TOKEN_BUDGET = 4000

// Per-tool-result cap. Multi-row campus_knowledge or search_events results
// can return 3-5K chars; 1500 preserves enough for the model to use without
// letting one tool call poison the rest of the turn.
export const TOOL_RESULT_MAX_CHARS = 1500

type Content = Anthropic.Messages.MessageParam['content']

export function estimateTokens(content: Content): number {
  if (typeof content === 'string') {
    return Math.ceil(content.length / CHARS_PER_TOKEN)
  }
  if (!Array.isArray(content)) return 0
  let chars = 0
  for (const block of content) {
    if (block.type === 'text') {
      chars += block.text.length
    } else if (block.type === 'tool_use') {
      chars += JSON.stringify(block.input).length + (block.name?.length ?? 0)
    } else if (block.type === 'tool_result') {
      const c = (block as Anthropic.Messages.ToolResultBlockParam).content
      chars += typeof c === 'string' ? c.length : JSON.stringify(c ?? '').length
    }
  }
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

export function estimateHistoryTokens(history: Anthropic.Messages.MessageParam[]): number {
  let total = 0
  for (const m of history) total += estimateTokens(m.content)
  return total
}

/**
 * Truncate a tool-result string to at most maxChars, preferring to cut at a
 * JSON object boundary when the result is JSON-shaped. Appends a marker so
 * the model knows data was dropped.
 */
export function truncateToolResult(result: string, maxChars = TOOL_RESULT_MAX_CHARS): string {
  if (result.length <= maxChars) return result
  const head = result.slice(0, maxChars)
  // If the head ends mid-JSON, prefer cutting at the last closing brace found
  // in the last 30% of the cut region — avoids leaving a dangling open object.
  const minBoundary = Math.floor(maxChars * 0.7)
  const lastBrace = Math.max(head.lastIndexOf('}'), head.lastIndexOf(']'))
  const cut = lastBrace >= minBoundary ? head.slice(0, lastBrace + 1) : head
  return `${cut}\n…[truncated: dropped ${result.length - cut.length} chars]`
}

/**
 * Trim history from the oldest end until the remainder fits the token budget.
 * Always keeps at least the most recent user+assistant pair when history has
 * >= 2 messages, so George never loses the immediate prior turn.
 *
 * Returns { kept, dropped } — the caller decides whether to summarize dropped.
 */
export function trimHistoryToBudget(
  history: Anthropic.Messages.MessageParam[],
  budgetTokens = HISTORY_TOKEN_BUDGET,
): { kept: Anthropic.Messages.MessageParam[]; dropped: Anthropic.Messages.MessageParam[] } {
  if (history.length === 0) return { kept: [], dropped: [] }

  const kept: Anthropic.Messages.MessageParam[] = []
  let tokens = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    const msgTokens = estimateTokens(msg.content)
    // Keep-at-least-one-turn floor: if we already have 2+ kept messages and
    // adding this one would breach the budget, stop.
    if (tokens + msgTokens > budgetTokens && kept.length >= 2) {
      return { kept, dropped: history.slice(0, i + 1) }
    }
    kept.unshift(msg)
    tokens += msgTokens
  }
  return { kept, dropped: [] }
}

/**
 * Summarize dropped messages into 2-3 sentences so the agent retains gist
 * (student profile facts, preferences, pending questions) after trimming.
 *
 * Returns null on API failure — caller should continue without a summary
 * rather than block the turn.
 */
export async function summarizeDroppedHistory(
  dropped: Anthropic.Messages.MessageParam[],
): Promise<string | null> {
  if (dropped.length === 0) return null

  const transcript = dropped
    .map((m) => {
      const text = renderForSummary(m.content)
      return `${m.role.toUpperCase()}: ${text.slice(0, 600)}`
    })
    .filter((line) => line.split(': ')[1]?.trim())
    .join('\n')

  if (!transcript) return null

  const system =
    '你要把下面这段 USC 学长(George) 和新生的对话压缩成中文 2-3 句摘要，' +
    '包含: 学生个人情况(专业/宿舍/爱好等已知事实)、明确偏好或决定、未解答的问题。' +
    '只输出摘要本身，不要前缀、不要解释。'

  try {
    const claude = getClaudeClient()
    const res = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: transcript }],
    })
    const block = res.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') return null
    const text = block.text.trim()
    return text || null
  } catch {
    return null
  }
}

function renderForSummary(content: Content): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((b) => {
      if (b.type === 'text') return b.text
      if (b.type === 'tool_use') return `[调用工具:${b.name}]`
      if (b.type === 'tool_result') return '[工具返回]'
      return ''
    })
    .filter(Boolean)
    .join(' ')
}
