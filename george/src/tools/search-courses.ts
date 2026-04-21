// Searches USC courses live via bia-roommate's WebReg proxy and enriches each
// section with the matching row from the `courses` catalog table (description,
// prereq, units, terms). WebReg returns codes without suffix letters (e.g. "201")
// while the catalog stores "201L"; we fall back to a prefix match per dept when
// an exact (dept, code) hit is missing.
//
// Header last reviewed: 2026-04-20

import { registerTool } from '../agent/tool-registry.js'
import { config } from '../config.js'
import { supabase } from '../db/client.js'

interface WebRegSection {
  department: string
  number: string
  title?: string
  units?: string
  [key: string]: unknown
}

interface CatalogRow {
  dept: string
  code: string
  description: string | null
  prereq: string | null
  units: string | null
  terms: string | null
}

registerTool(
  'search_courses',
  'Search USC courses live from WebReg, enriched with catalog description / prerequisites / units / terms from the scraped course catalog. Use this when the student asks about sections, sections + instructors, or general course discovery.',
  {
    properties: {
      query: { type: 'string', description: 'Search term' },
      semester: { type: 'string', description: 'Semester code (e.g., 20263)' },
    },
    required: ['query'],
  },
  async (input) => {
    const params = new URLSearchParams({ q: input.query as string })
    if (input.semester) params.set('semester', input.semester as string)
    const res = await fetch(
      `${config.biaRoommate.baseUrl}/api/courses/search?${params}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return `Course search failed (${res.status})`
    const data = (await res.json()) as WebRegSection[]
    if (!Array.isArray(data) || data.length === 0) return 'No courses found.'

    // Collect distinct departments seen in sections so we can do a single
    // Supabase round-trip filtered by dept IN (...). We then match codes
    // in-memory (exact first, then prefix).
    const depts = Array.from(
      new Set(
        data
          .map((s) => s?.department)
          .filter((d): d is string => typeof d === 'string' && d.length > 0),
      ),
    )

    const byExact: Record<string, CatalogRow> = {}
    const byDept: Record<string, CatalogRow[]> = {}

    if (depts.length > 0) {
      const { data: rows } = await supabase
        .from('courses')
        .select('dept, code, description, prereq, units, terms')
        .in('dept', depts)
      for (const row of (rows as CatalogRow[] | null) ?? []) {
        byExact[`${row.dept}:${row.code}`] = row
        ;(byDept[row.dept] ??= []).push(row)
      }
    }

    const enriched = data.map((s) => {
      const dept = s.department
      const code = s.number
      const exact = byExact[`${dept}:${code}`]
      if (exact) return { ...s, catalog: exact }
      // Fallback: WebReg "201" should match catalog "201L"/"201R" etc.
      const candidates = byDept[dept] ?? []
      const prefixMatch = candidates.find(
        (row) => row.code !== code && row.code.startsWith(code),
      )
      return { ...s, catalog: prefixMatch ?? null }
    })

    return JSON.stringify(enriched, null, 2)
  },
)
