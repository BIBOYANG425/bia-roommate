import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'search_roommates',
  'Search BIA roommate profiles.',
  {
    properties: {
      query: { type: 'string', description: 'Search term' },
      gender: { type: 'string', description: 'Gender filter' },
      year: { type: 'string', description: 'Year filter' },
    },
  },
  async (input) => {
    let q = supabase
      .from('roommate_profiles')
      .select('name, gender, year, major, sleep_habit, clean_level, noise_level, hobbies, bio')
      .order('created_at', { ascending: false })
      .limit(10)
    if (input.gender) q = q.eq('gender', input.gender as string)
    if (input.year) q = q.eq('year', input.year as string)
    if (input.query) {
      const query = (input.query as string).replace(/[%_.*(),]/g, '')
      if (query.length > 0) {
        q = q.or(`name.ilike.%${query}%,major.ilike.%${query}%,hobbies.ilike.%${query}%`)
      }
    }
    const { data } = await q
    if (!data || data.length === 0) return 'No roommate profiles found.'
    return JSON.stringify(data, null, 2)
  },
)
