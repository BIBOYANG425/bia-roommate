import {
  getPendingShippingNotifications,
  markStaleNotificationsSkipped,
  markShippingNotificationSent,
  markShippingNotificationSkipped,
  markShippingNotificationFailed,
} from '../db/shipping-notifications.js'
import { sendPlatformMessage } from '../adapters/send-message.js'
import { log } from '../observability/logger.js'

// Static bilingual copy per notification kind. Deterministic (no LLM) — shipping
// status updates are transactional, not conversational. Pickup kinds template
// the enqueued payload (location/window/member_id). Bad-news kinds stay neutral
// and point to a human (an officer reaches out; see the 15-min delay below).
type MessageFn = (p: Record<string, unknown>) => string

function fmtDate(v: unknown): string {
  if (typeof v !== 'string') return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function fmtWindow(p: Record<string, unknown>): string {
  const s = fmtDate(p.pickup_starts_at)
  const e = fmtDate(p.pickup_ends_at)
  if (s && e) return `，时间 ${s}–${e}`
  if (e) return `，截止 ${e}`
  return ''
}

const MESSAGES: Record<string, string | MessageFn> = {
  received_cn:
    '📦 你的包裹已到中国仓库，等待打包发货 / Your parcel arrived at the China warehouse.',
  in_transit:
    '✈️ 你的包裹已发往美国 / Your parcel is on its way to the US.',
  arrived_us:
    '🇺🇸 你的包裹已到美国，请留意取件通知 / Your parcel landed in the US — pickup info coming.',
  picked_up_thanks:
    '✅ 包裹已取件，感谢使用 BIA 集运 / Picked up. Thanks for using BIA shipping!',
  pickup_open: (p) =>
    `🎉 可取件啦！地点：${p.pickup_location ?? '见群通知'}${fmtWindow(p)}。带上 member ID ${p.member_id ?? ''}。\nReady for pickup! Bring your member ID.`,
  pickup_reminder: (p) =>
    `⏰ 别忘了取件${p.pickup_ends_at ? `，截止 ${fmtDate(p.pickup_ends_at)}` : ''}（${p.pickup_location ?? '见群通知'}）。过期可能要重新安排。\nReminder: please pick up before it closes.`,
  orphan_received:
    '📦 仓库收到一个未认领的包裹。如果是你的，去 uscbia.com/shipping 绑定 member ID 认领。\nAn unclaimed parcel arrived — claim it at uscbia.com/shipping.',
  lost:
    '⚠️ 你的一个包裹出现异常（疑似丢失），BIA 运营会尽快联系你处理。\nOne of your parcels has an issue — our team will reach out.',
  returned:
    '↩️ 你的一个包裹被退回，BIA 运营会联系你说明后续。\nA parcel was returned — our team will contact you.',
  disputed:
    '❗ 你的一个包裹状态有争议，正在核实，会尽快给你答复。\nA parcel is under review — we will follow up shortly.',
}

export function messageForKind(
  kind: string,
  payload?: Record<string, unknown> | null,
): string | null {
  const m = MESSAGES[kind]
  if (m == null) return null
  return typeof m === 'function' ? m(payload ?? {}) : m
}

// Bad-news kinds get a head start: hold them ~15 min so an officer can reach out
// personally before the automated "有异常" message lands. We just skip them this
// tick (leave 'pending'); a later */5 tick re-picks them once 15 min elapse.
// 15 min ≪ the 24h stale cutoff, so a delayed row is never staled out first.
const BAD_NEWS = new Set(['lost', 'returned', 'disputed'])
const BAD_NEWS_DELAY_MS = 15 * 60 * 1000

// Drains pending shipping notifications and delivers each via the existing
// platform-message channel (WeChat customer-service message / iMessage), the
// same path reminder-sender uses. Single-attempt: success → 'sent', delivery
// error → 'failed' (terminal). No-copy / no-platform / opted-out → 'skipped'.
export async function sendPendingShippingNotifications() {
  // Triage first: pending rows scheduled >24h ago are stale (backlog built up
  // while the notifier was disabled or down) — mark them 'skipped' instead of
  // blasting outdated status updates at students, and log how many.
  const staleCount = await markStaleNotificationsSkipped()
  if (staleCount > 0) {
    log('warn', 'shipping_notifications_stale_skipped', { count: staleCount })
  }

  const pending = await getPendingShippingNotifications()
  if (pending.length === 0) return

  for (const n of pending) {
    const id = n.id as string
    const kind = n.kind as string
    // student_id → students is a to-one FK (object at runtime); the generated
    // types don't yet know the new table's relation, so cast through unknown.
    const student = n.students as unknown as Record<string, unknown> | null

    // Bad-news head start: hold ~15 min, retry on a later tick.
    if (BAD_NEWS.has(kind)) {
      const createdMs = new Date(n.created_at as string).getTime()
      if (Number.isFinite(createdMs) && Date.now() - createdMs < BAD_NEWS_DELAY_MS) {
        continue
      }
    }

    const text = messageForKind(kind, n.payload as Record<string, unknown> | null)
    if (!text) {
      await markShippingNotificationSkipped(id, 'no_copy_for_kind')
      continue
    }
    if (!student) {
      await markShippingNotificationSkipped(id, 'no_student')
      continue
    }
    if (student.shipping_notif_opt_out) {
      await markShippingNotificationSkipped(id, 'opted_out')
      continue
    }
    const platform = student.wechat_open_id ? ('wechat' as const) : ('imessage' as const)
    const platformId = (student.wechat_open_id || student.imessage_id) as string | null
    if (!platformId) {
      await markShippingNotificationSkipped(id, 'no_platform_id')
      continue
    }

    try {
      await sendPlatformMessage(platform, platformId, text)
      await markShippingNotificationSent(id)
      log('info', 'shipping_notification_sent', { id, kind, platform })
    } catch (err) {
      await markShippingNotificationFailed(id, (err as Error).message)
      log('error', 'shipping_notification_error', { id, error: (err as Error).message })
    }
  }
}
