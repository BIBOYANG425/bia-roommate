import { NextRequest } from "next/server";
import { getCurrentSemesterCode } from "@/lib/course-planner/semester";

// Share cache with autocomplete route is tricky across files,
// so we maintain our own cache here too
const cache = new Map<string, { data: CourseEntry[]; ts: number }>();
const CACHE_TTL = 3600_000;
const MAX_CACHE_ENTRIES = 10;
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
    const cached = cache.get(semester);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      courses = cached.data;
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
      if (cache.size >= MAX_CACHE_ENTRIES) {
        // Evict oldest entry
        let oldestKey = "";
        let oldestTs = Infinity;
        for (const [k, v] of cache) {
          if (v.ts < oldestTs) {
            oldestTs = v.ts;
            oldestKey = k;
          }
        }
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(semester, { data: courses, ts: Date.now() });
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
