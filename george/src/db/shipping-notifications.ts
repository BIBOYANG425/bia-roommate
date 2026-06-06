import { supabase } from './client.js'

// Drains the shipping_notifications queue (producer = parcels AFTER-UPDATE
// trigger, migration 20260606_parcel_notification_enqueue.sql). Joins students
// for the delivery platform id. Bounded LIMIT so one cron tick can't run away.
export async function getPendingShippingNotifications() {
  const { data } = await supabase
    .from('shipping_notifications')
    .select('id, kind, payload, students(id, wechat_open_id, imessage_id, name)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(100)
  return data || []
}

export async function markShippingNotificationSent(id: string) {
  await supabase
    .from('shipping_notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
}

// Terminal non-delivery we never want to retry (no copy for the kind, or the
// student has no reachable platform id).
export async function markShippingNotificationSkipped(id: string, reason: string) {
  await supabase
    .from('shipping_notifications')
    .update({ status: 'skipped', error: reason })
    .eq('id', id)
}

// Delivery attempt failed. Terminal with this schema (no retry_count column);
// a future retry/backoff would add one. Acts as the dead-letter state.
export async function markShippingNotificationFailed(id: string, error: string) {
  await supabase
    .from('shipping_notifications')
    .update({ status: 'failed', error })
    .eq('id', id)
}
