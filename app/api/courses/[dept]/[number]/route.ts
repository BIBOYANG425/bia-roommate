import { NextRequest } from 'next/server'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Transform USC API section schedule to our SectionTime format
function transformSchedule(schedule: any[]): any[] {
  if (!schedule || schedule.length === 0) {
    return [{ day: 'TBA', start_time: '', end_time: '', location: '' }]
  }
  return schedule.map((s: any) => ({
    day: s.dayCode || 'TBA',
    start_time: s.startTime || '',
    end_time: s.endTime || '',
    location: '', // USC API doesn't include location in basic course query
  }))
}

// Transform a USC API section to our Section format
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dept: string; number: string }> }
) {
  const { dept, number } = await params
  const semester = request.nextUrl.searchParams.get('semester') || '20263'

  // USC API uses smashed course code: "CSCI201" (no space, no hyphen)
  const courseCode = `${dept.toUpperCase()}${number}`

  try {
    const res = await fetch(
      `https://classes.usc.edu/api/Courses/Course?termCode=${semester}&courseCode=${encodeURIComponent(courseCode)}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return Response.json({ error: 'USC API error' }, { status: res.status })
    }

    const data = await res.json()

    // Transform to our Course type
    const course = {
      department: data.scheduledCourseCode?.prefix || dept.toUpperCase(),
      number: (data.scheduledCourseCode?.number || number) + (data.scheduledCourseCode?.suffix || ''),
      title: data.name || data.fullCourseName || '',
      units: data.courseUnits?.[0]?.toString() || '',
      description: data.description || '',
      sections: (data.sections || []).map(transformSection),
    }

    return Response.json(course, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  } catch {
    return Response.json({ error: 'Network error' }, { status: 502 })
  }
}
