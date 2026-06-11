import { randomInt } from 'node:crypto'
import { supabase } from './client.js'
import { isClaimBlocked, recordFailedClaim } from '../security/link-code-limiter.js'
import { log } from '../observability/logger.js'

export async function getStudentById(id: string) {
  const { data } = await supabase.from('students').select('*').eq('id', id).single()
  return data
}

export async function updateStudent(id: string, updates: Record<string, unknown>) {
  await supabase
    .from('students')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function resolveStudentId(userId: string, platform: 'wechat' | 'imessage'): Promise<string> {
  const column = platform === 'wechat' ? 'wechat_open_id' : 'imessage_id'
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq(column, userId)
    .single()

  if (data) return data.id

  // Race-safe create: two concurrent messages from the same new user both
  // miss the SELECT above and both try to INSERT. The second one hits the
  // unique constraint on the platform id column, the insert returns null,
  // and the old `newStudent!.id` crashed with TypeError. On insert failure
  // we re-SELECT since the other request presumably created the row.
  const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase()
  const { data: newStudent, error: insertError } = await supabase
    .from('students')
    .insert({ [column]: userId, referral_code: referralCode })
    .select('id')
    .single()

  if (newStudent) return newStudent.id

  const { data: recovered } = await supabase
    .from('students')
    .select('id')
    .eq(column, userId)
    .single()

  if (recovered) return recovered.id

  throw new Error(
    `resolveStudentId failed for ${platform}:${userId.slice(0, 8)}…: ${
      insertError?.message ?? 'unknown insert error'
    }`,
  )
}

export async function generateLinkCode(studentId: string): Promise<string> {
  // CSPRNG: Math.random is predictable and these 6-digit codes live in one
  // global namespace reachable from the unauthenticated relay. randomInt
  // closes the predictable-seed avenue; a larger namespace / per-student
  // scoping would need a schema change (future migration).
  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
  await supabase
    .from('students')
    .update({ link_code: code, link_code_expires_at: expiresAt })
    .eq('id', studentId)
  return code
}

const CLAIM_RETRY_MESSAGE = '链接没成功，稍后再试一次。'
const CLAIM_SUCCESS_MESSAGE = '账号链接成功！现在你的微信和iMessage是同一个George了 👻'

export async function claimLinkCode(
  code: string,
  claimingStudentId: string,
  claimingPlatform: 'wechat' | 'imessage',
): Promise<{ success: boolean; message: string }> {
  // Failed-attempt limiter: refuse before touching the DB once this claimer
  // (or the process globally) has burned its failed guesses — 6-digit codes
  // in a global namespace are brute-forceable from the unauthenticated relay.
  if (isClaimBlocked(claimingStudentId)) {
    log('warn', 'link_code_claim_blocked', { claimingStudentId })
    return { success: false, message: '尝试次数太多了，过 10 分钟再试。' }
  }

  const { data: target } = await supabase
    .from('students')
    .select('id, wechat_open_id, imessage_id, link_code_expires_at')
    .eq('link_code', code)
    .single()

  if (!target) {
    recordFailedClaim(claimingStudentId)
    return { success: false, message: '验证码不存在' }
  }
  if (new Date(target.link_code_expires_at) < new Date()) {
    recordFailedClaim(claimingStudentId)
    return { success: false, message: '验证码已过期' }
  }
  if (target.id === claimingStudentId) {
    return { success: false, message: '不能链接自己的账号' }
  }

  const { data: claimer } = await supabase
    .from('students')
    .select('wechat_open_id, imessage_id')
    .eq('id', claimingStudentId)
    .single()

  if (!claimer) return { success: false, message: '找不到你的账号' }

  const platformColumn = claimingPlatform === 'wechat' ? 'wechat_open_id' : 'imessage_id'
  const platformValue = claimer[platformColumn]
  // Never null out the target's platform id — a claimer row without an id for
  // the claiming platform shouldn't exist (resolveStudentId creates it with one).
  if (!platformValue) {
    log('error', 'link_code_claim_failed', { step: 'claimer_missing_platform_id', claimingStudentId, claimingPlatform })
    return { success: false, message: '找不到你的账号' }
  }

  // Sequenced claim — supabase-js has no transactions; a truly atomic claim
  // needs a SECURITY DEFINER RPC (future migration). The order guarantees a
  // partial failure can never strand the target ("victim") row, and the
  // claimer-row DELETE happens last:
  //   1. free the platform id on the claimer row first — the column is UNIQUE,
  //      so attaching it to the target while the claimer still holds it would
  //      violate the constraint (the old Promise.all version hit exactly that,
  //      silently, because errors were never checked)
  //   2. attach it to the target row + burn the link code (single-use)
  //   3. re-parent the claimer's messages onto the target
  //   4. delete the now-empty claimer row — strictly after 3, because
  //      messages.student_id is ON DELETE CASCADE
  const { error: freeError } = await supabase
    .from('students')
    .update({ [platformColumn]: null })
    .eq('id', claimingStudentId)
  if (freeError) {
    log('error', 'link_code_claim_failed', { step: 'free_claimer_platform_id', claimingStudentId, error: freeError.message })
    return { success: false, message: CLAIM_RETRY_MESSAGE }
  }
  log('info', 'link_code_claim_step', { step: 'claimer_platform_id_freed', claimingStudentId })

  const { error: attachError } = await supabase
    .from('students')
    .update({ [platformColumn]: platformValue, link_code: null, link_code_expires_at: null })
    .eq('id', target.id)
  if (attachError) {
    // Best-effort rollback of step 1 so the claimer keeps a working account.
    await supabase.from('students').update({ [platformColumn]: platformValue }).eq('id', claimingStudentId)
    log('error', 'link_code_claim_failed', { step: 'attach_target_platform_id', targetId: target.id, error: attachError.message })
    return { success: false, message: CLAIM_RETRY_MESSAGE }
  }
  log('info', 'link_code_claim_step', { step: 'target_linked_code_burned', targetId: target.id })

  const { error: reparentError } = await supabase
    .from('messages')
    .update({ student_id: target.id })
    .eq('student_id', claimingStudentId)
  if (reparentError) {
    // The link itself succeeded. Keep the claimer row: deleting it now would
    // CASCADE-delete the messages we failed to move. The leftover row has no
    // platform ids, so it is unreachable and harmless.
    log('error', 'link_code_claim_failed', { step: 'reparent_messages', claimingStudentId, error: reparentError.message })
    return { success: true, message: CLAIM_SUCCESS_MESSAGE }
  }
  log('info', 'link_code_claim_step', { step: 'messages_reparented', targetId: target.id })

  const { error: deleteError } = await supabase.from('students').delete().eq('id', claimingStudentId)
  if (deleteError) {
    // Leftover empty row, unreachable — log and move on.
    log('error', 'link_code_claim_failed', { step: 'delete_claimer_row', claimingStudentId, error: deleteError.message })
  } else {
    log('info', 'link_code_claim_step', { step: 'claimer_row_deleted', claimingStudentId })
  }

  return { success: true, message: CLAIM_SUCCESS_MESSAGE }
}

export async function loadStudentMemories(studentId: string, limit = 20) {
  const { data } = await supabase
    .from('student_memories')
    .select('key, value, category')
    .eq('student_id', studentId)
    .order('last_referenced_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getReferralCount(studentId: string): Promise<number> {
  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', studentId)
  return count || 0
}
