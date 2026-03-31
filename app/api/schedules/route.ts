import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, semester, courses, preferences, schedule_data } = body

  if (!semester || !courses || !schedule_data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_schedules')
    .insert([{
      user_id: user.id,
      name: name || 'My Schedule',
      semester,
      courses,
      preferences: preferences || null,
      schedule_data,
    }])
    .select('id, name, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const { data, error } = await supabase
      .from('saved_schedules')
      .select('id, name, semester, courses, preferences, schedule_data, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('saved_schedules')
    .select('id, name, semester, courses, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
