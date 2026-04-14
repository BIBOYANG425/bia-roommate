import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'post_sublet',
  'Post a sublet listing through George.',
  {
    properties: {
      title: { type: 'string', description: 'Listing title' },
      description: { type: 'string', description: 'Description' },
      location: { type: 'string', description: 'Location' },
      price_monthly: { type: 'number', description: 'Monthly rent' },
      available_from: { type: 'string', description: 'Available from' },
      available_to: { type: 'string', description: 'Available until' },
      contact: { type: 'string', description: 'Contact info' },
    },
    required: ['title', 'price_monthly'],
  },
  async (input) => {
    if (!input.student_id) return 'No student context available.'
    const { error } = await supabase.from('sublets').insert({
      student_id: input.student_id as string,
      title: input.title as string,
      description: (input.description as string) || null,
      location: (input.location as string) || null,
      price_monthly: input.price_monthly as number,
      available_from: (input.available_from as string) || null,
      available_to: (input.available_to as string) || null,
      contact: (input.contact as string) || null,
    })
    if (error) return 'Failed to post sublet.'
    return 'Sublet posted! Other students can find it through George. 🏠'
  },
)
