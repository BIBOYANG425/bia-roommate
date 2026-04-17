import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

// Embeds text via OpenAI text-embedding-3-small (1536-d, matches schema).
// Returns null if OPENAI_API_KEY is not set — callers should fall back to
// non-vector dedupe/search rather than throwing.
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings error: ${res.status}`)
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  return data.data[0].embedding
}

registerTool(
  'campus_knowledge',
  "Search George's campus knowledge base for study spots, food recs, building tips.",
  {
    properties: {
      query: { type: 'string', description: 'What to search for' },
      category: { type: 'string', description: 'Category: food, study, buildings, tips, local' },
    },
    required: ['query'],
  },
  async (input) => {
    const query = input.query as string
    const category = input.category as string | undefined

    let q = supabase
      .from('campus_knowledge')
      .select('title, content, category')
      .limit(5)

    if (category) q = q.eq('category', category)
    q = q.textSearch('content', query.split(/\s+/).join(' & '), { type: 'plain' })

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No campus knowledge found for that query.'
    }
    return JSON.stringify(data, null, 2)
  },
)
