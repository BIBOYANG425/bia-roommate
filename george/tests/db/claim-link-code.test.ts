// Hermetic unit tests for claimLinkCode's refusal guards. The real students.ts
// suite path is env-gated (config throws at import without prod keys), so this
// file mocks db/client.js + the logger entirely — same pattern as the
// link-code-limiter and shipping-notifier tests — and drives the chainable
// supabase query builder with a queued-response fake that records every write.
//
// Header last reviewed: 2026-06-11

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const singleQueue: Array<{ data: unknown }> = []
  const writes: Array<{ table: string; op: 'update' | 'delete' | 'insert'; payload?: unknown }> = []

  function makeBuilder(table: string) {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.update = vi.fn((payload: unknown) => {
      writes.push({ table, op: 'update', payload })
      return chain
    })
    chain.delete = vi.fn(() => {
      writes.push({ table, op: 'delete' })
      return chain
    })
    chain.insert = vi.fn((payload: unknown) => {
      writes.push({ table, op: 'insert', payload })
      return chain
    })
    chain.single = vi.fn(() => Promise.resolve(singleQueue.shift() ?? { data: null }))
    // Write chains are awaited directly (no .single()) — make the builder thenable.
    chain.then = (resolve: (v: { error: null }) => void) => resolve({ error: null })
    return chain
  }

  return {
    singleQueue,
    writes,
    supabase: { from: vi.fn((table: string) => makeBuilder(table)) },
  }
})

vi.mock('../../src/db/client.js', () => ({ supabase: h.supabase }))
vi.mock('../../src/observability/logger.js', () => ({ log: vi.fn() }))

import { claimLinkCode } from '../../src/db/students.js'
import { _resetLinkCodeLimiterForTest } from '../../src/security/link-code-limiter.js'

const FUTURE = () => new Date(Date.now() + 5 * 60_000).toISOString()

beforeEach(() => {
  h.singleQueue.length = 0
  h.writes.length = 0
  _resetLinkCodeLimiterForTest()
})

describe('claimLinkCode refusal guards', () => {
  it('refuses when the target is already linked on the claiming platform (no overwrite)', async () => {
    // Victim scenario: target already has a wechat_open_id; an attacker (or a
    // second wechat account) claiming the code must NOT overwrite it.
    h.singleQueue.push({
      data: {
        id: 'target-1',
        wechat_open_id: 'wx-victim',
        imessage_id: 'im-target',
        link_code_expires_at: FUTURE(),
      },
    })

    const result = await claimLinkCode('123456', 'claimer-1', 'wechat')

    expect(result.success).toBe(false)
    expect(result.message).toBe('对方账号已经绑定了一个微信，不能重复链接。如果需要换绑，请先解绑或联系我们处理。')
    // Refusal happens before the claimer SELECT and before any write.
    expect(h.writes).toEqual([])
    expect(h.singleQueue).toEqual([])
  })

  it('uses the iMessage label when claiming from iMessage', async () => {
    h.singleQueue.push({
      data: {
        id: 'target-1',
        wechat_open_id: 'wx-target',
        imessage_id: 'im-victim',
        link_code_expires_at: FUTURE(),
      },
    })

    const result = await claimLinkCode('123456', 'claimer-1', 'imessage')

    expect(result.success).toBe(false)
    expect(result.message).toContain('iMessage')
    expect(h.writes).toEqual([])
  })

  it('refuses a dual-linked claimer (other platform id set) instead of merging/deleting it', async () => {
    h.singleQueue.push({
      data: {
        id: 'target-1',
        wechat_open_id: null,
        imessage_id: 'im-target',
        link_code_expires_at: FUTURE(),
      },
    })
    // Claimer holds BOTH platform ids: merging would re-parent the iMessage
    // history too, then delete the row that still owns the iMessage identity.
    h.singleQueue.push({
      data: { wechat_open_id: 'wx-claimer', imessage_id: 'im-claimer' },
    })

    const result = await claimLinkCode('123456', 'claimer-1', 'wechat')

    expect(result.success).toBe(false)
    expect(result.message).toBe('你的账号已经同时绑定了微信和iMessage，不能再链接到其他账号。如需调整请联系我们。')
    expect(h.writes).toEqual([])
  })

  it('still completes a normal claim: free → attach+burn → re-parent → delete', async () => {
    h.singleQueue.push({
      data: {
        id: 'target-1',
        wechat_open_id: null,
        imessage_id: 'im-target',
        link_code_expires_at: FUTURE(),
      },
    })
    h.singleQueue.push({
      data: { wechat_open_id: 'wx-claimer', imessage_id: null },
    })

    const result = await claimLinkCode('123456', 'claimer-1', 'wechat')

    expect(result.success).toBe(true)
    expect(h.writes).toEqual([
      { table: 'students', op: 'update', payload: { wechat_open_id: null } },
      {
        table: 'students',
        op: 'update',
        payload: { wechat_open_id: 'wx-claimer', link_code: null, link_code_expires_at: null },
      },
      { table: 'messages', op: 'update', payload: { student_id: 'target-1' } },
      { table: 'students', op: 'delete' },
    ])
  })
})
