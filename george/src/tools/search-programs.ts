// Search USC programs (majors/minors/certificates) ingested from catalogue.usc.edu.
// Uses the same FTS/ILIKE fallback helper as campus_knowledge so it works with or
// without pgvector. Optional `school` filter (matches school name fragment).
// Populated by: scripts/ingest-catalogue.ts (USC catalogue.usc.edu scraper).
//
// Header last reviewed: 2026-04-20

import { registerTool } from '../agent/tool-registry.js'
import { searchWithFallback } from './search-helpers.js'

registerTool(
  'search_programs',
  'Search USC programs (majors, minors, certificates, degrees). Returns name, school, degree_type, and description. Optional school filter.',
  {
    properties: {
      query: { type: 'string', description: 'Free-text search — program name, topic, or school fragment' },
      school: { type: 'string', description: 'Optional: restrict to one school, e.g. "Marshall", "Viterbi", "Dornsife"' },
    },
    required: ['query'],
  },
  async (input) => {
    const query = String(input.query ?? '').trim()
    const school = input.school ? String(input.school).trim() : undefined
    if (query.length < 2) return 'No programs matched that query.'

    const data = await searchWithFallback<{
      name: string
      degree_type: string | null
      school: string | null
      description: string | null
    }>('programs', 'name, degree_type, school, description', query, {
      ftsColumn: 'description',
      ilikeColumns: ['name', 'description'],
      applyFilters: (q) => (school ? q.ilike('school', `%${school}%`) : q),
    })

    if (!data || data.length === 0) return 'No programs matched that query.'
    return JSON.stringify(data)
  },
)
