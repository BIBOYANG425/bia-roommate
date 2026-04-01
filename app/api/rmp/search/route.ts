import { NextRequest } from 'next/server'

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
          school {
            id
            name
          }
        }
      }
    }
  }
}
`

const USC_SCHOOL_ID = 'U2Nob29sLTEzODE='

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return Response.json(null)
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    let res: Response
    try {
      res = await fetch('https://www.ratemyprofessors.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic dGVzdDp0ZXN0',
        },
        body: JSON.stringify({
          query: TEACHER_SEARCH_QUERY,
          variables: {
            query: {
              text: name,
              schoolID: USC_SCHOOL_ID,
            },
          },
        }),
        next: { revalidate: 86400 },
        signal: controller.signal,
      })
    } catch {
      return Response.json(null)
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      return Response.json(null)
    }

    const data = await res.json()
    const edges = data?.data?.newSearch?.teachers?.edges
    if (!edges || edges.length === 0) {
      return Response.json(null)
    }

    // Match professor by name — try exact match first, then first+last only
    const cleanName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
    const nameParts = name.trim().toLowerCase().split(/\s+/)
    const searchFirst = cleanName(nameParts[0] || '')
    const searchLast = cleanName(nameParts[nameParts.length - 1] || '')

    let teacher = null
    // Pass 1: exact first+last match
    for (const edge of edges) {
      const fn = cleanName(edge.node.firstName || '')
      const ln = cleanName(edge.node.lastName || '')
      if (fn === searchFirst && ln === searchLast) {
        teacher = edge.node
        break
      }
    }
    // Pass 2: last name match + first name starts with same chars
    if (!teacher) {
      for (const edge of edges) {
        const fn = cleanName(edge.node.firstName || '')
        const ln = cleanName(edge.node.lastName || '')
        if (ln === searchLast && (fn.startsWith(searchFirst) || searchFirst.startsWith(fn))) {
          teacher = edge.node
          break
        }
      }
    }
    // Pass 3: fall back to first result from same school
    if (!teacher) {
      teacher = edges[0].node
    }

    return Response.json(
      {
        avgRating: teacher.avgRating,
        avgDifficulty: teacher.avgDifficulty,
        numRatings: teacher.numRatings,
        wouldTakeAgainPercent: teacher.wouldTakeAgainPercent ?? -1,
        legacyId: teacher.legacyId,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400' } }
    )
  } catch {
    return Response.json(null)
  }
}
