import { NextRequest } from 'next/server'
import { getRecommendations } from '@/lib/course-planner/recommender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { interests, semester, units } = body as { interests: string; semester: string; units?: string | null }

    if (!interests || interests.trim().length < 2) {
      return Response.json({ error: 'Please describe your interests' }, { status: 400 })
    }

    // Build the base URL for internal API calls
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${proto}://${host}`

    const recommendations = await getRecommendations(
      interests,
      semester || '20263',
      baseUrl,
      units || undefined
    )

    return Response.json(recommendations, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    })
  } catch {
    return Response.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
