import { NextRequest } from "next/server";
import { GE_MAP } from "@/lib/course-planner/ge-map";

/* eslint-disable @typescript-eslint/no-explicit-any */

function transformSection(sec: any): any {
  const schedule = sec.schedule || [];
  return {
    id: sec.sisSectionId || "",
    type: sec.rnrMode || "Lecture",
    number: sec.sisSectionId || "",
    times:
      schedule.length > 0
        ? schedule.map((s: any) => ({
            day: s.dayCode || "TBA",
            start_time: s.startTime || "",
            end_time: s.endTime || "",
            location: "",
          }))
        : [{ day: "TBA", start_time: "", end_time: "", location: "" }],
    instructor: sec.instructors?.[0]
      ? {
          firstName: sec.instructors[0].firstName,
          lastName: sec.instructors[0].lastName,
        }
      : { firstName: "", lastName: "" },
    registered: sec.registeredSeats || 0,
    capacity: sec.totalSeats || 0,
    isClosed: sec.isFull || false,
    isCancelled: sec.isCancelled || false,
  };
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category"); // e.g. "GE-A"
  const semester = request.nextUrl.searchParams.get("semester") || "20263";

  if (!category || !GE_MAP[category]) {
    return Response.json({ error: "Invalid GE category" }, { status: 400 });
  }

  const { requirementPrefix, categoryPrefix } = GE_MAP[category];

  try {
    // Get GE courses for this category
    const res = await fetch(
      `https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode=${semester}&geRequirementPrefix=${requirementPrefix}&categoryPrefix=${categoryPrefix}`,
      { next: { revalidate: 600 } },
    );

    if (!res.ok) {
      return Response.json({ error: "USC API error" }, { status: res.status });
    }

    const data = await res.json();
    const courses = Array.isArray(data) ? data : data.courses || [];

    // Transform to our Course format — only include courses that have schedulable sections
    const transformed = courses
      .map((c: any) => ({
        department: c.scheduledCourseCode?.prefix || c.prefix || "",
        number:
          (c.scheduledCourseCode?.number || c.classNumber || "") +
          (c.scheduledCourseCode?.suffix || c.suffix || ""),
        title: c.name || c.fullCourseName || "",
        units: c.courseUnits?.[0]?.toString() || "",
        description: c.description || "",
        sections: (c.sections || []).map(transformSection),
      }))
      .filter((c: any) => {
        // Only include courses that have at least one non-cancelled section with actual times
        return c.sections.some(
          (s: any) =>
            !s.isCancelled &&
            s.times.some((t: any) => t.start_time && t.day !== "TBA"),
        );
      });

    return Response.json(transformed, {
      headers: { "Cache-Control": "public, s-maxage=600" },
    });
  } catch {
    return Response.json({ error: "Network error" }, { status: 502 });
  }
}
