import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const profileIds = searchParams.get('ids')?.split(',').filter(Boolean)

  if (!profileIds || profileIds.length === 0) {
    return NextResponse.json({})
  }

  const { data, error } = await supabase
    .from('profile_likes')
    .select('profile_id')
    .in('profile_id', profileIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.profile_id] = (counts[row.profile_id] || 0) + 1
  }

  return NextResponse.json(counts)
}
