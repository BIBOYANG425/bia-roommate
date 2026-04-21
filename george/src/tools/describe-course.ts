// Looks up a single USC course in the `courses` table populated from catalogue.usc.edu.
// Exact-match only (dept + code). For fuzzy discovery, use search_courses.
// Populated by: scripts/ingest-catalogue.ts (USC catalogue.usc.edu scraper).
//
// Header last reviewed: 2026-04-20

import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'describe_course',
  'Look up the catalog description, units, prerequisites, and terms for a specific USC course. Exact match on department + code (e.g., dept="WRIT", code="150").',
  {
    properties: {
      dept: { type: 'string', description: 'Department code, e.g. "CSCI", "WRIT"' },
      code: { type: 'string', description: 'Course number, e.g. "201L", "150"' },
    },
    required: ['dept', 'code'],
  },
  async (input) => {
    const dept = String(input.dept ?? '').toUpperCase().trim()
    const code = String(input.code ?? '').toUpperCase().trim()
    if (!/^[A-Z]{2,5}$/.test(dept) || !/^\d{1,4}[A-Z]?$/.test(code)) {
      return `Course ${dept} ${code} not found in the USC catalog.`
    }
    const { data, error } = await supabase
      .from('courses')
      .select('dept, code, title, description, units, terms, prereq, corequisite, recommended_prep, restriction, mode, grading, source_url')
      .eq('dept', dept)
      .eq('code', code)
      .limit(1)
      .maybeSingle()

    if (error) return `Lookup failed: ${error.message}`
    if (!data) return `Course ${dept} ${code} not found in the USC catalog.`
    return JSON.stringify(data, null, 2)
  },
)
