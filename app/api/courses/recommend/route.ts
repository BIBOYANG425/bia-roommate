import { NextRequest } from 'next/server'
import { getRecommendations } from '@/lib/course-planner/recommender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { interests, semester, units } = body as { interests: string; semester: string; units?: string | null }

    if (!interests || interests.trim().length < 2) {
      return Response.json({ error: 'Please describe your interests' }, { status: 400 })
    }

    const baseUrl = request.nextUrl.origin

    const recommendations = await getRecommendations(
      interests,
      semester || '20263',
      baseUrl,
      units || undefined
    )

    return Response.json(recommendations)
  } catch {
    return Response.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
