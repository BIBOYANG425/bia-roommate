import { NextRequest } from 'next/server'
import { corsHeaders, handleOptions } from '@/lib/cors'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_COURSES = 20

function transformSchedule(schedule: any[]): any[] {
  if (!schedule || schedule.length === 0) {
    return [{ day: 'TBA', start_time: '', end_time: '', location: '' }]
  }
  return schedule.map((s: any) => ({
    day: s.dayCode || 'TBA',
    start_time: s.startTime || '',
    end_time: s.endTime || '',
    location: '',
  }))
}

function transformSection(sec: any): any {
  return {
    id: sec.sisSectionId || '',
    type: sec.rnrMode || 'Lecture',
    number: sec.sisSectionId || '',
    times: transformSchedule(sec.schedule),
    instructor: sec.instructors?.[0]
      ? { firstName: sec.instructors[0].firstName, lastName: sec.instructors[0].lastName }
      : { firstName: '', lastName: '' },
    registered: sec.registeredSeats || 0,
    capacity: sec.totalSeats || 0,
    isClosed: sec.isFull || false,
    isCancelled: sec.isCancelled || false,
  }
}

async function fetchCourse(courseCode: string, semester: string): Promise<any | null> {
  // courseCode format: "CSCI-201" → USC API wants "CSCI201"
  const apiCode = courseCode.replace('-', '')

  try {
    const res = await fetch(
      `https://classes.usc.edu/api/Courses/Course?termCode=${semester}&courseCode=${encodeURIComponent(apiCode)}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) return null
    const data = await res.json()

    return {
      department: data.scheduledCourseCode?.prefix || courseCode.split('-')[0],
      number: (data.scheduledCourseCode?.number || courseCode.split('-')[1]) + (data.scheduledCourseCode?.suffix || ''),
      title: data.name || data.fullCourseName || '',
      units: data.courseUnits?.[0]?.toString() || '',
      description: data.description || '',
      sections: (data.sections || [])
        .filter((s: any) => !s.isCancelled)
        .map(transformSection),
    }
  } catch {
    return null
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request)
  const coursesParam = request.nextUrl.searchParams.get('courses')
  const semester = request.nextUrl.searchParams.get('semester') || '20263'

  if (!coursesParam) {
    return Response.json({ error: 'Missing courses parameter' }, { status: 400, headers: cors })
  }

  if (!/^20\d{2}[1-3]$/.test(semester)) {
    return Response.json({ error: 'Invalid semester format' }, { status: 400, headers: cors })
  }

  const codes = coursesParam.split(',').map((c) => c.trim()).filter(Boolean).slice(0, MAX_COURSES)
  if (codes.length === 0) {
    return Response.json({ courses: [] }, { headers: cors })
  }

  // Fetch all courses in parallel
  const results = await Promise.allSettled(codes.map((c) => fetchCourse(c, semester)))

  const courses = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)

  return Response.json({ courses }, {
    headers: { 'Cache-Control': 'public, s-maxage=300', ...cors },
  })
}
