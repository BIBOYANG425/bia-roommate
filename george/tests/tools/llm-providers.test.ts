import { describe, it, expect } from 'vitest'
import { getClaudeClient, callLightweightLLM } from '../../src/agent/llm-providers.js'

describe('LLM providers', () => {
  it('exports a Claude client', () => {
    expect(typeof getClaudeClient).toBe('function')
  })
  it('exports a lightweight LLM caller', () => {
    expect(typeof callLightweightLLM).toBe('function')
  })
})
