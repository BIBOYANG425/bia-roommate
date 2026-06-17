import { describe, it, expect, beforeEach, vi } from 'vitest'

const { getPending, markStale, markSent, markSkipped, markFailed, sendMsg } = vi.hoisted(() => ({
  getPending: vi.fn(),
  markStale: vi.fn(),
  markSent: vi.fn(),
  markSkipped: vi.fn(),
  markFailed: vi.fn(),
  sendMsg: vi.fn(),
}))

vi.mock('../../src/db/shipping-notifications.js', () => ({
  getPendingShippingNotifications: getPending,
  markStaleNotificationsSkipped: markStale,
  markShippingNotificationSent: markSent,
  markShippingNotificationSkipped: markSkipped,
  markShippingNotificationFailed: markFailed,
}))
vi.mock('../../src/adapters/send-message.js', () => ({ sendPlatformMessage: sendMsg }))
vi.mock('../../src/observability/logger.js', () => ({ log: vi.fn() }))

import {
  messageForKind,
  sendPendingShippingNotifications,
} from '../../src/jobs/shipping-notifier.js'

beforeEach(() => {
  getPending.mockReset()
  markStale.mockReset()
  markStale.mockResolvedValue(0)
  markSent.mockReset()
  markSkipped.mockReset()
  markFailed.mockReset()
  sendMsg.mockReset()
})

describe('messageForKind', () => {
  it('returns copy for known kinds', () => {
    expect(messageForKind('received_cn')).toContain('中国仓库')
    expect(messageForKind('picked_up_thanks')).toContain('取件')
  })
  it('returns null for an unknown / non-copy kind', () => {
    expect(messageForKind('orphan_received')).toBeNull()
    expect(messageForKind('bogus')).toBeNull()
  })
})

describe('sendPendingShippingNotifications', () => {
  it('sends via WeChat and marks sent', async () => {
    getPending.mockResolvedValue([
      { id: 'n1', kind: 'received_cn', payload: {}, students: { wechat_open_id: 'wx1', name: 'A' } },
    ])
    sendMsg.mockResolvedValue(undefined)
    await sendPendingShippingNotifications()
    expect(sendMsg).toHaveBeenCalledWith('wechat', 'wx1', expect.stringContaining('中国仓库'))
    expect(markSent).toHaveBeenCalledWith('n1')
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('falls back to iMessage when there is no WeChat id', async () => {
    getPending.mockResolvedValue([
      { id: 'n2', kind: 'in_transit', payload: {}, students: { imessage_id: 'im2' } },
    ])
    sendMsg.mockResolvedValue(undefined)
    await sendPendingShippingNotifications()
    expect(sendMsg).toHaveBeenCalledWith('imessage', 'im2', expect.any(String))
    expect(markSent).toHaveBeenCalledWith('n2')
  })

  it('skips (no retry) when there is no copy for the kind', async () => {
    getPending.mockResolvedValue([
      { id: 'n3', kind: 'orphan_received', payload: {}, students: { wechat_open_id: 'wx' } },
    ])
    await sendPendingShippingNotifications()
    expect(sendMsg).not.toHaveBeenCalled()
    expect(markSkipped).toHaveBeenCalledWith('n3', 'no_copy_for_kind')
  })

  it('skips when the student has no reachable platform id', async () => {
    getPending.mockResolvedValue([
      { id: 'n4', kind: 'arrived_us', payload: {}, students: { name: 'X' } },
    ])
    await sendPendingShippingNotifications()
    expect(sendMsg).not.toHaveBeenCalled()
    expect(markSkipped).toHaveBeenCalledWith('n4', 'no_platform_id')
  })

  it('marks failed (dead-letter) when delivery throws', async () => {
    getPending.mockResolvedValue([
      { id: 'n5', kind: 'received_cn', payload: {}, students: { wechat_open_id: 'wx5' } },
    ])
    sendMsg.mockRejectedValue(new Error('wechat 500'))
    await sendPendingShippingNotifications()
    expect(markFailed).toHaveBeenCalledWith('n5', 'wechat 500')
    expect(markSent).not.toHaveBeenCalled()
  })

  it('no-ops cleanly on an empty queue', async () => {
    getPending.mockResolvedValue([])
    await sendPendingShippingNotifications()
    expect(sendMsg).not.toHaveBeenCalled()
  })

  it('triages stale pending rows before fetching the queue', async () => {
    getPending.mockResolvedValue([])
    await sendPendingShippingNotifications()
    expect(markStale).toHaveBeenCalledTimes(1)
    expect(markStale.mock.invocationCallOrder[0]).toBeLessThan(
      getPending.mock.invocationCallOrder[0],
    )
  })

  it('still delivers fresh rows after skipping a stale backlog', async () => {
    markStale.mockResolvedValue(42)
    getPending.mockResolvedValue([
      { id: 'n6', kind: 'in_transit', payload: {}, students: { wechat_open_id: 'wx6' } },
    ])
    sendMsg.mockResolvedValue(undefined)
    await sendPendingShippingNotifications()
    expect(sendMsg).toHaveBeenCalledWith('wechat', 'wx6', expect.any(String))
    expect(markSent).toHaveBeenCalledWith('n6')
  })
})
