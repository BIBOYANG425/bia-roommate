import { callLightweightLLM } from './llm-providers.js'
import type { SubAgent } from './personality.js'

export type Intent = SubAgent | 'general'

export async function classifyIntent(
  message: string,
  recentContext?: string,
): Promise<Intent> {
  const prompt = `Classify this student message into exactly one category.

Categories:
- event: looking for events, activities, things to do, event reminders, event submissions
- course: courses, classes, professors, schedule planning, course reviews, registration
- housing: apartments, sublets, housing, rent, moving, living
- social: meet people, roommates, friends, connections, introductions
- campus: study spots, food, campus tips, buildings, local knowledge, weather, general USC info
- general: greetings, chit-chat, personal questions, jokes, anything that doesn't fit above

${recentContext ? `Recent conversation context: ${recentContext}\n` : ''}
Student message: "${message}"

Respond with ONLY the category name, nothing else.`

  try {
    const result = await callLightweightLLM(
      [{ role: 'user', content: prompt }],
      { maxTokens: 10 },
    )
    const intent = result.trim().toLowerCase() as Intent
    const valid: Intent[] = ['event', 'course', 'housing', 'social', 'campus', 'general']
    return valid.includes(intent) ? intent : 'general'
  } catch {
    return 'general'
  }
}
