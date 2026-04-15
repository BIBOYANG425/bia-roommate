import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'search_sublets',
  'Search available sublets and housing near USC.',
  {
    properties: {
      max_price: { type: 'number', description: 'Maximum monthly rent' },
      location: { type: 'string', description: 'Location preference' },
      available_from: { type: 'string', description: 'Earliest move-in date' },
    },
  },
  async (input) => {
    let q = supabase
      .from('sublets')
      .select('title, description, location, price_monthly, available_from, available_to')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)
    if (typeof input.max_price === 'number') q = q.lte('price_monthly', input.max_price)
    if (input.location) q = q.ilike('location', `%${input.location as string}%`)
    if (input.available_from) q = q.gte('available_from', input.available_from as string)
    const { data, error } = await q
    if (error) return 'Failed to search sublets.'
    if (!data || data.length === 0) return 'No sublets found.'
    return JSON.stringify(data, null, 2)
  },
)
