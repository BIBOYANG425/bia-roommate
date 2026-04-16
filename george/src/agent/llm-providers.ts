// LLM dispatch layer. Wraps Anthropic Claude (main) and Kimi/Moonshot (lightweight fallback)
// behind a unified call signature. Sub-agents use Claude Sonnet 4.6; intent classifier,
// proactive messages, and memory extraction use Kimi/Haiku. Single point to swap models.
//
// Header last reviewed: 2026-04-16

import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { log } from '../observability/logger.js'

const claude = new Anthropic({ apiKey: config.anthropic.apiKey })

export function getClaudeClient(): Anthropic {
  return claude
}

export async function callLightweightLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; jsonMode?: boolean },
): Promise<string> {
  const apiKey = config.kimi.apiKey

  if (!apiKey) {
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: options?.maxTokens || 500,
      system: messages.find((m) => m.role === 'system')?.content,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    })
    const text = response.content.find((b) => b.type === 'text')?.text
    return text || ''
  }

  const body: Record<string, unknown> = {
    model: 'moonshot-v1-8k',
    messages,
    max_tokens: options?.maxTokens || 500,
  }
  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const err = await res.text()
    log('error', 'kimi_api_error', { status: res.status, body: err })
    throw new Error(`Kimi API error: ${res.status}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0].message.content
}
