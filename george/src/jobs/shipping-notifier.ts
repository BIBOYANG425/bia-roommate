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
// status updates are transactional, not conversational. Keep <= a couple lines.
const MESSAGES: Record<string, string> = {
  received_cn:
    '📦 你的包裹已到中国仓库，等待打包发货 / Your parcel arrived at the China warehouse.',
  in_transit:
    '✈️ 你的包裹已发往美国 / Your parcel is on its way to the US.',
  arrived_us:
    '🇺🇸 你的包裹已到美国，请留意取件通知 / Your parcel landed in the US — pickup info coming.',
  picked_up_thanks:
    '✅ 包裹已取件，感谢使用 BIA 集运 / Picked up. Thanks for using BIA shipping!',
}

export function messageForKind(kind: string): string | null {
  return MESSAGES[kind] ?? null
}

// Drains pending shipping notifications and delivers each via the existing
// platform-message channel (WeChat customer-service message / iMessage), the
// same path reminder-sender uses. Single-attempt: success → 'sent', delivery
// error → 'failed' (terminal). No-copy / no-platform → 'skipped'.
//
//   queue(status='pending') ──► sendPlatformMessage ──► mark 'sent'
//                          └─(no copy/student/id)──► mark 'skipped'
//                          └─(send throws)─────────► mark 'failed'(error)
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
    // student_id → students is a to-one FK (object at runtime); the generated
    // types don't yet know the new table's relation, so cast through unknown.
    const student = n.students as unknown as Record<string, unknown> | null
    const text = messageForKind(n.kind as string)

    if (!text) {
      await markShippingNotificationSkipped(id, 'no_copy_for_kind')
      continue
    }
    if (!student) {
      await markShippingNotificationSkipped(id, 'no_student')
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
      log('info', 'shipping_notification_sent', { id, kind: n.kind, platform })
    } catch (err) {
      await markShippingNotificationFailed(id, (err as Error).message)
      log('error', 'shipping_notification_error', { id, error: (err as Error).message })
    }
  }
}
