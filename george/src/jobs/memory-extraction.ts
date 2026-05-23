// Async job triggered after each message is processed. Kimi/Haiku call extracts personal
// facts from the recent transcript into student_memories. Non-blocking — runs after the
// response is sent. Deduped by (student_id, key) via Supabase upsert. The 5 course-planning
// categories (completed_course / ge_completed / units_preference / prof_bar /
// time_preference) feed get_student_academic_state so the course sub-agent can answer
// "what should I take" without re-asking known facts.
//
// Header last reviewed: 2026-05-22

import { callLightweightLLM } from '../agent/llm-providers.js'
import { supabase } from '../db/client.js'
import { log } from '../observability/logger.js'

const MEMORY_CATEGORIES = [
  'food_preference',
  'academic_interest',
  'social_preference',
  'mentioned_plan',
  'personal_fact',
  // Phase 3.2 — course planning intake state:
  'completed_course',
  'ge_completed',
  'units_preference',
  'prof_bar',
  'time_preference',
] as const

type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]
const VALID_CATEGORIES = new Set<string>(MEMORY_CATEGORIES)

interface ExtractedMemory {
  key: string
  value: string
  category: MemoryCategory
}

export async function extractMemories(studentId: string, conversationText: string) {
  try {
    const result = await callLightweightLLM(
      [
        {
          role: 'system',
          content: `Extract personal preferences, plans, or facts the student mentioned.
Return a JSON array of objects with {key, value, category}.

Categories:
- food_preference: dietary restrictions, favorite cuisines, dining hall opinions.
- academic_interest: majors, research interests, classes they want to take.
- social_preference: introvert/extrovert tendency, group size preference.
- mentioned_plan: future plans (e.g. "going home for winter break", "applying to grad school").
- personal_fact: year (freshman/sophomore/junior/senior/grad), major, hometown, age, etc.

Course-planning intake (extract these whenever the student mentions them — they unlock better course recommendations):
- completed_course: a course the student has already taken. key = course code ("CSCI 104"), value = semester or "completed".
- ge_completed: a USC GE category the student has finished. key = "GE-A".."GE-H", value = "done" or "in progress".
- units_preference: how many units the student wants per semester. key = "default", value = number or range (e.g. "12-16").
- prof_bar: minimum acceptable RMP rating. key = "default", value = "4.0" / "3.5" / "5.0".
- time_preference: when the student does/doesn't want class. key = "default", value = natural-language window (e.g. "no class before 10am").

If nothing notable, return empty array [].
Be selective — only extract things worth remembering for future conversations.`,
        },
        {
          role: 'user',
          content: `Student conversation:\n${conversationText}`,
        },
      ],
      { maxTokens: 400, jsonMode: true },
    )

    let memories: ExtractedMemory[]
    try {
      const parsed = JSON.parse(result)
      memories = Array.isArray(parsed) ? parsed : []
    } catch {
      return
    }

    if (memories.length === 0) return

    // Drop anything with an unknown category — the DB CHECK constraint would
    // reject it anyway, and logging the skip helps catch prompt drift.
    const valid = memories.filter((m): m is ExtractedMemory => {
      if (!m || typeof m.key !== 'string' || typeof m.value !== 'string') return false
      if (!VALID_CATEGORIES.has(m.category)) {
        log('warn', 'memory_unknown_category', { studentId, category: m.category })
        return false
      }
      return true
    })

    for (const mem of valid) {
      await supabase.from('student_memories').upsert(
        {
          student_id: studentId,
          key: mem.key,
          value: mem.value,
          category: mem.category,
          last_referenced_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,key' },
      )
    }

    log('info', 'memories_extracted', { studentId, count: memories.length })
  } catch (err) {
    log('error', 'memory_extraction_error', { studentId, error: (err as Error).message })
  }
}
