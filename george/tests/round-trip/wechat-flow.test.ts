import { describe, it, expect } from 'vitest'
import { processMessage } from '../../src/agent/george.js'

describe('Message processing', () => {
  it('processMessage is a function', () => {
    expect(typeof processMessage).toBe('function')
  })
  it('handles non-text messages', async () => {
    const result = await processMessage({
      userId: 'test-user',
      platform: 'wechat',
      text: '',
      msgType: 'voice',
      timestamp: Date.now(),
    })
    expect(result).toContain('语音')
    expect(result).toContain('打字')
  })
})
