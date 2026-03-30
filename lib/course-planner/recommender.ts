import { tokenize, tokenMatchScore, getDepartmentMatches } from './interest-map'

export interface RecommendedCourse {
  department: string
  number: string
  title: string
  units: string
  description: string
  relevanceScore: number
  matchReasons: string[]
  geTag?: string
}

interface AutocompleteCourse {
  fullCourseName: string
  name: string
  prefix: string
  scheduledCourseCode: {
    prefix: string
    number: string
    suffix: string
    courseSmashed: string
  }
  courseUnits: number[] | null
  classNumber: string
}

// ─── Tier 1: Score using only name + department (no API calls) ───
function scoreTier1(
  course: AutocompleteCourse,
  tokens: string[],
  matchedDepts: Set<string>
): { score: number; matched: string[] } {
  const title = course.name || ''
  const dept = course.scheduledCourseCode?.prefix || course.prefix || ''
  const num = parseInt(course.classNumber || course.scheduledCourseCode?.number || '999')

  // Title keyword match (strongest signal)
  const titleResult = tokenMatchScore(tokens, title)

  // Also check against full course name (e.g., "CSCI 201")
  const fullNameResult = tokenMatchScore(tokens, course.fullCourseName || '')

  const bestTitleScore = Math.max(titleResult.score, fullNameResult.score)
  const allMatched = [...new Set([...titleResult.matched, ...fullNameResult.matched])]

  // Department relevance
  const deptScore = matchedDepts.has(dept) ? 1.0 : 0

  // Freshman-level bonus (100-200 level courses)
  const freshmanBonus = num < 300 ? 0.5 : num < 500 ? 0.2 : 0

  const score = bestTitleScore * 3.0 + deptScore * 2.0 + freshmanBonus

  return { score, matched: allMatched }
}

// ─── Tier 2: Score with full description ───
function scoreTier2(
  title: string,
  description: string,
  dept: string,
  courseNumber: string,
  tokens: string[],
  matchedDepts: Set<string>,
  geTag?: string
): { score: number; matched: string[] } {
  const num = parseInt(courseNumber || '999')

  // Description keyword match (best signal when available)
  const descResult = description ? tokenMatchScore(tokens, description) : { score: 0, matched: [] as string[] }

  // Title keyword match
  const titleResult = tokenMatchScore(tokens, title)

  // Department relevance
  const deptScore = matchedDepts.has(dept) ? 1.0 : 0

  // GE fulfillment bonus (freshmen need GEs)
  const geBonus = geTag ? 2.5 : 0

  // Freshman-level bonus
  const freshmanBonus = num < 300 ? 0.5 : num < 500 ? 0.2 : 0

  const score =
    descResult.score * 4.0 +
    titleResult.score * 3.0 +
    deptScore * 2.0 +
    geBonus +
    freshmanBonus

  const allMatched = [...new Set([...descResult.matched, ...titleResult.matched])]

  return { score, matched: allMatched }
}

// ─── GE category mapping (duplicated from ge route for server-side use) ───
const GE_MAP: Record<string, { requirementPrefix: string; categoryPrefix: string; label: string }> = {
  'GE-A': { requirementPrefix: 'ACORELIT', categoryPrefix: 'ARTS', label: 'The Arts' },
  'GE-B': { requirementPrefix: 'ACORELIT', categoryPrefix: 'HINQ', label: 'Humanistic Inquiry' },
  'GE-C': { requirementPrefix: 'ACORELIT', categoryPrefix: 'SANA', label: 'Social Analysis' },
  'GE-D': { requirementPrefix: 'ACORELIT', categoryPrefix: 'LIFE', label: 'Life Sciences' },
  'GE-E': { requirementPrefix: 'ACORELIT', categoryPrefix: 'PSC', label: 'Physical Sciences' },
  'GE-F': { requirementPrefix: 'ACORELIT', categoryPrefix: 'QREA', label: 'Quantitative Reasoning' },
  'GE-G': { requirementPrefix: 'AGLOPERS', categoryPrefix: 'GPG', label: 'Global Perspectives I' },
  'GE-H': { requirementPrefix: 'AGLOPERS', categoryPrefix: 'GPH', label: 'Global Perspectives II' },
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Main recommendation engine (runs server-side) ───
export async function getRecommendations(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter?: string
): Promise<RecommendedCourse[]> {
  const tokens = tokenize(interestText)
  if (tokens.length === 0) return []

  const matchedDepts = getDepartmentMatches(tokens)

  // ── Tier 1: Score all courses from autocomplete cache ──
  const autoRes = await fetch(
    `${baseUrl}/api/courses/autocomplete?q=&termCode=${semester}&all=true`
  )
  const autoCourses: AutocompleteCourse[] = autoRes.ok
    ? (await autoRes.json()).courses || []
    : []

  const tier1Scored = autoCourses
    .map((c) => {
      const { score, matched } = scoreTier1(c, tokens, matchedDepts)
      return { course: c, score, matched }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const top30 = tier1Scored.slice(0, 30)

  // ── Tier 2: Fetch details for top candidates + all GE categories ──
  // Parallel: 30 course detail fetches + 8 GE category fetches
  const detailPromises = top30.map(async (item) => {
    const code = item.course.scheduledCourseCode
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/Course?termCode=${semester}&courseCode=${code.courseSmashed}`
      )
      if (!res.ok) return null
      const data = await res.json()
      return {
        department: code.prefix,
        number: code.number + (code.suffix || ''),
        title: data.name || data.fullCourseName || item.course.name || '',
        description: data.description || '',
        units: data.courseUnits?.[0]?.toString() || '',
        tier1Matched: item.matched,
      }
    } catch {
      return null
    }
  })

  const gePromises = Object.entries(GE_MAP).map(async ([geCode, { requirementPrefix, categoryPrefix }]) => {
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode=${semester}&geRequirementPrefix=${requirementPrefix}&categoryPrefix=${categoryPrefix}`
      )
      if (!res.ok) return []
      const data = await res.json()
      const courses = data.courses || []
      return courses
        .filter((c: any) =>
          c.sections?.some(
            (s: any) => !s.isCancelled && s.schedule?.some((sch: any) => sch.startTime)
          )
        )
        .map((c: any) => ({
          department: c.scheduledCourseCode?.prefix || '',
          number: (c.scheduledCourseCode?.number || '') + (c.scheduledCourseCode?.suffix || ''),
          title: c.name || c.fullCourseName || '',
          description: c.description || '',
          units: c.courseUnits?.[0]?.toString() || '',
          geTag: geCode,
        }))
    } catch {
      return []
    }
  })

  const [detailResults, ...geResults] = await Promise.all([
    Promise.all(detailPromises),
    ...gePromises,
  ])

  // ── Score all Tier 2 candidates ──
  const scored: RecommendedCourse[] = []
  const seen = new Set<string>()

  // Score top-30 detail-fetched courses
  for (const detail of detailResults) {
    if (!detail) continue
    const key = `${detail.department}-${detail.number}`
    if (seen.has(key)) continue
    seen.add(key)

    const { score, matched } = scoreTier2(
      detail.title,
      detail.description,
      detail.department,
      detail.number,
      tokens,
      matchedDepts
    )

    if (score > 0) {
      // Reconstruct original user-facing match reasons from stemmed tokens
      const reasons = [...new Set([...matched, ...detail.tier1Matched])]
      scored.push({
        department: detail.department,
        number: detail.number,
        title: detail.title,
        units: detail.units,
        description: detail.description,
        relevanceScore: Math.round(score * 100) / 100,
        matchReasons: reasons,
      })
    }
  }

  // Score GE courses
  for (const geCourses of geResults) {
    for (const gc of geCourses as any[]) {
      const key = `${gc.department}-${gc.number}`
      if (seen.has(key)) continue
      seen.add(key)

      const { score, matched } = scoreTier2(
        gc.title,
        gc.description,
        gc.department,
        gc.number,
        tokens,
        matchedDepts,
        gc.geTag
      )

      if (score > 0) {
        scored.push({
          department: gc.department,
          number: gc.number,
          title: gc.title,
          units: gc.units,
          description: gc.description,
          relevanceScore: Math.round(score * 100) / 100,
          matchReasons: matched,
          geTag: gc.geTag,
        })
      }
    }
  }

  // Sort by relevance, filter by units if specified, return top 15
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const filtered = unitsFilter
    ? scored.filter((c) => c.units === unitsFilter)
    : scored
  return filtered.slice(0, 15)
}
