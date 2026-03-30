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
    // Transform to simpler format
    const terms = (data as { termCode: number; season: string; year: number }[]).map((t) => ({
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
