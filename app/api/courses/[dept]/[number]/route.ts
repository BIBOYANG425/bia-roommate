import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dept: string; number: string }> }
) {
  const { dept, number } = await params
  const semester = request.nextUrl.searchParams.get('semester') || '20261'

  try {
    const res = await fetch(
      `https://classes.usc.edu/api/classes/${encodeURIComponent(dept)}/${encodeURIComponent(number)}?semester=${semester}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return Response.json({ error: 'USC API error' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  } catch {
    return Response.json({ error: 'Network error' }, { status: 502 })
  }
}
