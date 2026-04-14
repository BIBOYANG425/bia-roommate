import { supabase } from './client.js'

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

  const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase()
  const { data: newStudent } = await supabase
    .from('students')
    .insert({ [column]: userId, referral_code: referralCode })
    .select('id')
    .single()

  return newStudent!.id
}

export async function generateLinkCode(studentId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
  await supabase
    .from('students')
    .update({ link_code: code, link_code_expires_at: expiresAt })
    .eq('id', studentId)
  return code
}

export async function claimLinkCode(
  code: string,
  claimingStudentId: string,
  claimingPlatform: 'wechat' | 'imessage',
): Promise<{ success: boolean; message: string }> {
  const { data: target } = await supabase
    .from('students')
    .select('id, wechat_open_id, imessage_id, link_code_expires_at')
    .eq('link_code', code)
    .single()

  if (!target) return { success: false, message: '验证码不存在' }
  if (new Date(target.link_code_expires_at) < new Date()) {
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

  await Promise.all([
    supabase
      .from('students')
      .update({ [platformColumn]: platformValue, link_code: null, link_code_expires_at: null })
      .eq('id', target.id),
    supabase
      .from('messages')
      .update({ student_id: target.id })
      .eq('student_id', claimingStudentId),
  ])
  await supabase.from('students').delete().eq('id', claimingStudentId)

  return { success: true, message: '账号链接成功！现在你的微信和iMessage是同一个George了 👻' }
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
