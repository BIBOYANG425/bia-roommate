import { supabase } from './client.js'
import Anthropic from '@anthropic-ai/sdk'

export async function loadRecentMessages(
  studentId: string,
  limit = 20,
): Promise<Anthropic.Messages.MessageParam[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!data || data.length === 0) return []

  return data.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
}

export async function saveMessage(params: {
  studentId: string
  platform: 'wechat' | 'imessage'
  role: 'user' | 'assistant'
  content: string
  toolCalls?: unknown
  agent?: string
  tokensUsed?: number
}) {
  await supabase.from('messages').insert({
    student_id: params.studentId,
    platform: params.platform,
    role: params.role,
    content: params.content,
    tool_calls: params.toolCalls || null,
    agent: params.agent || null,
    tokens_used: params.tokensUsed || null,
  })
}
