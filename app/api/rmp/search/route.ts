import { NextRequest } from "next/server";

const TEACHER_SEARCH_QUERY = `
query TeacherSearchQuery($query: TeacherSearchQuery!) {
  newSearch {
    teachers(query: $query) {
      edges {
        node {
          id
          legacyId
          firstName
          lastName
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
          school {
            id
            name
          }
        }
      }
    }
  }
}
`;

const USC_SCHOOL_ID = "U2Nob29sLTExMTI=";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return Response.json(null);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic dGVzdDp0ZXN0",
        },
        body: JSON.stringify({
          query: TEACHER_SEARCH_QUERY,
          variables: {
            query: {
              text: name,
              schoolID: USC_SCHOOL_ID,
            },
          },
        }),
        next: { revalidate: 86400 },
        signal: controller.signal,
      });
    } catch {
      return Response.json(null);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return Response.json(null);
    }

    const data = await res.json();
    const edges = data?.data?.newSearch?.teachers?.edges;
    if (!edges || edges.length === 0) {
      return Response.json(null);
    }

    // Prefer exact name match over fuzzy first result
    const nameParts = name.trim().toLowerCase().split(/\s+/);
    let teacher = edges[0].node;
    for (const edge of edges) {
      const fn = (edge.node.firstName || "").trim().toLowerCase();
      const ln = (edge.node.lastName || "").trim().toLowerCase();
      if (nameParts.includes(fn) && nameParts.includes(ln)) {
        teacher = edge.node;
        break;
      }
    }

    return Response.json(
      {
        avgRating: teacher.avgRating,
        avgDifficulty: teacher.avgDifficulty,
        numRatings: teacher.numRatings,
        wouldTakeAgainPercent: teacher.wouldTakeAgainPercent ?? -1,
        legacyId: teacher.legacyId,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  } catch {
    return Response.json(null);
  }
}
