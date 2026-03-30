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

const USC_SCHOOL_ID = 'U2Nob29sLTExMTI='

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return Response.json(null)
  }

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
          query: {
            text: name,
            schoolID: USC_SCHOOL_ID,
          },
        },
      }),
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      return Response.json(null)
    }

    const data = await res.json()
    const edges = data?.data?.newSearch?.teachers?.edges
    if (!edges || edges.length === 0) {
      return Response.json(null)
    }

    const teacher = edges[0].node
    return Response.json(
      {
        avgRating: teacher.avgRating,
        avgDifficulty: teacher.avgDifficulty,
        numRatings: teacher.numRatings,
        wouldTakeAgainPercent: teacher.wouldTakeAgainPercent,
        legacyId: teacher.legacyId,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400' } }
    )
  } catch {
    return Response.json(null)
  }
}
