import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const semester = request.nextUrl.searchParams.get('semester') || '20261'

  if (!q) {
    return Response.json([])
  }

  try {
    const res = await fetch(
      `https://classes.usc.edu/api/classes/basic?q=${encodeURIComponent(q)}&semester=${semester}`,
      { next: { revalidate: 600 } }
    )

    if (!res.ok) {
      return Response.json({ error: 'USC API error' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=600' },
    })
  } catch {
    return Response.json({ error: 'Network error' }, { status: 502 })
  }
}
