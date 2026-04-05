import { NextRequest } from "next/server";
import { getCurrentSemesterCode } from "@/lib/course-planner/semester";
import { getCached, setCache } from "@/lib/course-planner/course-cache";

const SEMESTER_RE = /^20\d{2}[1-3]$/;

interface CourseEntry {
  fullCourseName: string;
  name: string;
  scheduledCourseCode: {
    prefix: string;
    number: string;
    suffix: string;
    courseHyphen: string;
    courseSmashed: string;
  };
  courseUnits: number[] | null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const semesterParam = request.nextUrl.searchParams.get("semester");
  const semester =
    semesterParam && SEMESTER_RE.test(semesterParam)
      ? semesterParam
      : getCurrentSemesterCode();

  if (!q) {
    return Response.json([]);
  }

  try {
    // Get or fetch the full course list
    let courses: CourseEntry[];
    const cached = getCached<CourseEntry[]>(semester);
    if (cached) {
      courses = cached;
    } else {
      const res = await fetch(
        `https://classes.usc.edu/api/Search/Autocomplete?termCode=${semester}`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) {
        return Response.json(
          { error: "USC API error" },
          { status: res.status },
        );
      }
      const data = await res.json();
      courses = data.courses || [];
      setCache(semester, courses);
    }

    // Filter and transform to SearchResult format
    const query = q.toUpperCase();
    const matches = courses
      .filter((c) => {
        const courseName = c.fullCourseName?.toUpperCase() || "";
        const title = c.name?.toUpperCase() || "";
        return courseName.includes(query) || title.includes(query);
      })
      .slice(0, 20)
      .map((c) => ({
        department: c.scheduledCourseCode?.prefix || "",
        number:
          (c.scheduledCourseCode?.number || "") +
          (c.scheduledCourseCode?.suffix || ""),
        title: c.name || c.fullCourseName || "",
        units: c.courseUnits?.[0]?.toString() || "",
      }));

    return Response.json(matches, {
      headers: { "Cache-Control": "public, s-maxage=600" },
    });
  } catch {
    return Response.json({ error: "Network error" }, { status: 502 });
  }
}
