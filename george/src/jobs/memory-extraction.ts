import { callLightweightLLM } from '../agent/llm-providers.js'
import { supabase } from '../db/client.js'
import { log } from '../observability/logger.js'

interface ExtractedMemory {
  key: string
  value: string
  category: 'food_preference' | 'academic_interest' | 'social_preference' | 'mentioned_plan' | 'personal_fact'
}

export async function extractMemories(studentId: string, conversationText: string) {
  try {
    const result = await callLightweightLLM(
      [
        {
          role: 'system',
          content: `Extract personal preferences, plans, or facts the student mentioned.
Return a JSON array of objects with {key, value, category}.
Categories: food_preference, academic_interest, social_preference, mentioned_plan, personal_fact
If nothing notable, return empty array [].
Be selective — only extract things worth remembering for future conversations.`,
        },
        {
          role: 'user',
          content: `Student conversation:\n${conversationText}`,
        },
      ],
      { maxTokens: 300, jsonMode: true },
    )

    let memories: ExtractedMemory[]
    try {
      const parsed = JSON.parse(result)
      memories = Array.isArray(parsed) ? parsed : []
    } catch {
      return
    }

    if (memories.length === 0) return

    for (const mem of memories) {
      const { data: existing } = await supabase
        .from('student_memories')
        .select('id')
        .eq('student_id', studentId)
        .eq('key', mem.key)
        .single()

      if (existing) {
        await supabase
          .from('student_memories')
          .update({ value: mem.value, last_referenced_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase.from('student_memories').insert({
          student_id: studentId,
          key: mem.key,
          value: mem.value,
          category: mem.category,
        })
      }
    }

    log('info', 'memories_extracted', { studentId, count: memories.length })
  } catch (err) {
    log('error', 'memory_extraction_error', { studentId, error: (err as Error).message })
  }
}
