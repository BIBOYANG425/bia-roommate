import { NextRequest } from 'next/server'
import { corsHeaders, handleOptions } from '@/lib/cors'

const TEACHER_SEARCH_QUERY = `
query TeacherSearchQuery($query: TeacherSearchQuery!) {
  newSearch {
    teachers(query: $query) {
      edges {
        node {
          id
          legacyId
          firstName
          lastName
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
        }
      }
    }
  }
}
`

const USC_SCHOOL_ID = 'U2Nob29sLTExMTI='
const MAX_NAMES = 50

interface RmpRating {
  avgRating: number
  avgDifficulty: number
  numRatings: number
  wouldTakeAgainPercent: number
  legacyId: number
}

// In-memory cache for batch lookups (cleared on cold start)
const rmpCache = new Map<string, RmpRating | null>()

async function lookupProfessor(name: string): Promise<RmpRating | null> {
  const cached = rmpCache.get(name)
  if (cached !== undefined) return cached

  try {
    const res = await fetch('https://www.ratemyprofessors.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic dGVzdDp0ZXN0',
      },
      body: JSON.stringify({
        query: TEACHER_SEARCH_QUERY,
        variables: {
          query: { text: name, schoolID: USC_SCHOOL_ID },
        },
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const edges = data?.data?.newSearch?.teachers?.edges
    if (!edges || edges.length === 0) {
      rmpCache.set(name, null)
      return null
    }

    // Prefer exact name match
    const nameParts = name.trim().toLowerCase().split(/\s+/)
    let teacher = edges[0].node
    for (const edge of edges) {
      const fn = (edge.node.firstName || '').trim().toLowerCase()
      const ln = (edge.node.lastName || '').trim().toLowerCase()
      if (nameParts.includes(fn) && nameParts.includes(ln)) {
        teacher = edge.node
        break
      }
    }

    const rating: RmpRating = {
      avgRating: teacher.avgRating,
      avgDifficulty: teacher.avgDifficulty,
      numRatings: teacher.numRatings,
      wouldTakeAgainPercent: teacher.wouldTakeAgainPercent ?? -1,
      legacyId: teacher.legacyId,
    }

    rmpCache.set(name, rating)
    return rating
  } catch {
    return null
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request)
  const namesParam = request.nextUrl.searchParams.get('names')
  if (!namesParam) {
    return Response.json({ error: 'Missing names parameter' }, { status: 400, headers: cors })
  }

  const names = namesParam.split(',').map((n) => n.trim()).filter(Boolean).slice(0, MAX_NAMES)
  if (names.length === 0) {
    return Response.json({ ratings: {} })
  }

  // Parallel lookups
  const results = await Promise.allSettled(names.map((n) => lookupProfessor(n)))

  const ratings: Record<string, RmpRating | null> = {}
  for (let i = 0; i < names.length; i++) {
    const result = results[i]
    ratings[names[i]] = result.status === 'fulfilled' ? result.value : null
  }

  return Response.json({ ratings }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400', ...cors },
  })
}
