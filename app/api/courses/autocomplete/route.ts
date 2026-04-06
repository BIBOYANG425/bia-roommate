import { NextRequest } from "next/server";
import { getCached, setCache } from "@/lib/course-planner/course-cache";

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
}

async function getCourses(termCode: string): Promise<CourseEntry[]> {
  const cached = getCached<CourseEntry[]>(termCode);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  let res: Response;
  try {
    res = await fetch(
      `https://classes.usc.edu/api/Search/Autocomplete?termCode=${termCode}`,
      { next: { revalidate: 3600 }, signal: controller.signal },
    );
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return [];
  const data = await res.json();
  const courses = data.courses || [];
  setCache(termCode, courses);
  return courses;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const termCode = request.nextUrl.searchParams.get("termCode") || "20263";
  const all = request.nextUrl.searchParams.get("all");

  try {
    const courses = await getCourses(termCode);

    // If all=true, return the full course list (used by recommender)
    if (all) {
      return Response.json(
        { courses },
        {
          headers: { "Cache-Control": "public, s-maxage=3600" },
        },
      );
    }

    if (!q || q.length < 2) {
      return Response.json([]);
    }

    // Filter by query (case-insensitive)
    const query = q.toUpperCase();
    const matches = courses
      .filter((c) => {
        const courseName = c.fullCourseName?.toUpperCase() || "";
        const title = c.name?.toUpperCase() || "";
        return courseName.includes(query) || title.includes(query);
      })
      .slice(0, 10)
      .map((c) => ({
        text: `${c.scheduledCourseCode?.courseHyphen || c.fullCourseName} ${c.name || ""}`.trim(),
      }));

    return Response.json(matches, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch {
    return Response.json({ error: "Network error" }, { status: 502 });
  }
}
