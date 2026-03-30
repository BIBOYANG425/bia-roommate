import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return Response.json([])
  }

  try {
    const res = await fetch(
      `https://classes.usc.edu/api/classes/autocomplete?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return Response.json({ error: 'USC API error' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  } catch {
    return Response.json({ error: 'Network error' }, { status: 502 })
  }
}
