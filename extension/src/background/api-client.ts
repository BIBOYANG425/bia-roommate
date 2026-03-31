import { BIA_API_BASE } from '../shared/constants'
import type { RmpRating, Course, RecommendedCourse } from '../shared/types'

// Uses the existing deployed /api/rmp/search endpoint (one professor at a time)
export async function fetchRmpSingle(name: string): Promise<RmpRating | null> {
  const res = await fetch(
    `${BIA_API_BASE}/api/rmp/search?name=${encodeURIComponent(name)}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  const data = await res.json()
  if (!data.avgRating && data.avgRating !== 0) return null
  return {
    avgRating: data.avgRating,
    avgDifficulty: data.avgDifficulty,
    numRatings: data.numRatings,
    wouldTakeAgainPercent: data.wouldTakeAgainPercent ?? -1,
    legacyId: data.legacyId,
  }
}

// Batch lookup using the server-side batch endpoint
export async function fetchRmpBatch(
  names: string[]
): Promise<Record<string, RmpRating | null>> {
  // Dedupe names to avoid redundant lookups
  const uniqueNames = [...new Set(names)]

  const encodedNames = uniqueNames.map(encodeURIComponent).join(',')
  const res = await fetch(
    `${BIA_API_BASE}/api/rmp/batch?names=${encodedNames}`,
    { signal: AbortSignal.timeout(15000) }
  )

  if (!res.ok) {
    // Fall back to individual lookups
    const results = await Promise.allSettled(
      uniqueNames.map((name) => fetchRmpSingle(name))
    )
    const ratings: Record<string, RmpRating | null> = {}
    for (let i = 0; i < uniqueNames.length; i++) {
      const r = results[i]
      ratings[uniqueNames[i]] = r.status === 'fulfilled' ? r.value : null
    }
    return ratings
  }

  const data = await res.json()
  const batchRatings: Record<string, RmpRating | null> = data.ratings ?? {}

  // Map back to all original names (including duplicates)
  const ratings: Record<string, RmpRating | null> = {}
  for (const name of names) {
    ratings[name] = batchRatings[name] ?? null
  }
  return ratings
}

// Fetch individual course detail using deployed /api/courses/{DEPT}/{NUMBER}
export async function fetchCourseDetail(
  courseCode: string,
  semester: string
): Promise<Course | null> {
  // courseCode is "DEPT-NUMBER" e.g. "CSCI-201"
  const [dept, number] = courseCode.split('-')
  if (!dept || !number) return null

  const res = await fetch(
    `${BIA_API_BASE}/api/courses/${dept}/${number}?semester=${semester}`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data as Course
}

// Fetch multiple courses in parallel
export async function fetchCoursebinDetails(
  courses: string[],
  semester: string
): Promise<Course[]> {
  const results = await Promise.allSettled(
    courses.map((code) => fetchCourseDetail(code, semester))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<Course | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((c): c is Course => c !== null)
}

// Fetch all courses fulfilling a GE category
export async function fetchGECourses(
  category: string,
  semester: string
): Promise<Course[]> {
  const res = await fetch(
    `${BIA_API_BASE}/api/courses/ge?category=${encodeURIComponent(category)}&semester=${semester}`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) throw new Error(`GE fetch failed: ${res.status}`)
  const data = await res.json()
  // API returns array directly or { courses: [...] }
  return Array.isArray(data) ? data : (data.courses ?? [])
}

export async function fetchRecommendations(
  interests: string,
  semester: string,
  units?: string
): Promise<RecommendedCourse[]> {
  const body: Record<string, string> = { interests, semester }
  if (units) body.units = units

  const res = await fetch(`${BIA_API_BASE}/api/courses/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`Recommend failed: ${res.status}`)
  const data = await res.json()
  // API returns array directly or { recommendations: [...] }
  return Array.isArray(data) ? data : (data.recommendations ?? [])
}
