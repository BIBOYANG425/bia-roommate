export async function GET() {
  try {
    const res = await fetch('https://classes.usc.edu/api/Terms/Active', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return Response.json({ error: 'USC API error' }, { status: res.status })
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
      return Response.json({ error: 'Unexpected response format' }, { status: 502 })
    }
    // Transform to simpler format
    const terms = data
      .filter((t) => typeof t.termCode === 'number' && typeof t.season === 'string' && typeof t.year === 'number')
      .map((t) => ({
        code: t.termCode.toString(),
        label: `${t.season} ${t.year}`,
      }))

    return Response.json(terms, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  } catch {
    return Response.json({ error: 'Network error' }, { status: 502 })
  }
}
