import { NextRequest } from "next/server";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { USC_SCHOOL_ID } from "@/lib/rmp";

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
        }
      }
    }
  }
}
`;

const MAX_NAMES = 50;

interface RmpRating {
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number;
  legacyId: number;
}

// In-memory cache for batch lookups (cleared on cold start)
const rmpCache = new Map<string, RmpRating | null>();

async function lookupProfessor(name: string): Promise<RmpRating | null> {
  const cached = rmpCache.get(name);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch("https://www.ratemyprofessors.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic dGVzdDp0ZXN0",
      },
      body: JSON.stringify({
        query: TEACHER_SEARCH_QUERY,
        variables: {
          query: { text: name, schoolID: USC_SCHOOL_ID },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const edges = data?.data?.newSearch?.teachers?.edges;
    if (!edges || edges.length === 0) {
      rmpCache.set(name, null);
      return null;
    }

    // Match professor — full normalized name, then first+last, then fuzzy
    const cleanName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    const fullNormalized = cleanName(name);
    const nameParts = name.trim().toLowerCase().split(/\s+/);
    const searchFirst = cleanName(nameParts[0] || "");
    const searchLast = cleanName(nameParts[nameParts.length - 1] || "");

    let teacher = null;
    // Pass 1: full normalized name match
    for (const edge of edges) {
      const edgeFull = cleanName(
        (edge.node.firstName || "") + (edge.node.lastName || ""),
      );
      if (edgeFull === fullNormalized) {
        teacher = edge.node;
        break;
      }
    }
    // Pass 2: exact first+last match
    if (!teacher) {
      for (const edge of edges) {
        const fn = cleanName(edge.node.firstName || "");
        const ln = cleanName(edge.node.lastName || "");
        if (fn === searchFirst && ln === searchLast) {
          teacher = edge.node;
          break;
        }
      }
    }
    // Pass 3: fuzzy last name + first name prefix
    if (!teacher) {
      for (const edge of edges) {
        const fn = cleanName(edge.node.firstName || "");
        const ln = cleanName(edge.node.lastName || "");
        if (
          ln === searchLast &&
          (fn.startsWith(searchFirst) || searchFirst.startsWith(fn))
        ) {
          teacher = edge.node;
          break;
        }
      }
    }

    if (!teacher) {
      rmpCache.set(name, null);
      return null;
    }

    const rating: RmpRating = {
      avgRating: teacher.avgRating,
      avgDifficulty: teacher.avgDifficulty,
      numRatings: teacher.numRatings,
      wouldTakeAgainPercent: teacher.wouldTakeAgainPercent ?? -1,
      legacyId: teacher.legacyId,
    };

    rmpCache.set(name, rating);
    return rating;
  } catch {
    return null;
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request) ?? new Response(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request);
  const namesParam = request.nextUrl.searchParams.get("names");
  if (!namesParam) {
    return Response.json(
      { error: "Missing names parameter" },
      { status: 400, headers: cors },
    );
  }

  const names = namesParam
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_NAMES);
  if (names.length === 0) {
    return Response.json({ ratings: {} });
  }

  // Parallel lookups
  const results = await Promise.allSettled(
    names.map((n) => lookupProfessor(n)),
  );

  const ratings: Record<string, RmpRating | null> = {};
  for (let i = 0; i < names.length; i++) {
    const result = results[i];
    ratings[names[i]] = result.status === "fulfilled" ? result.value : null;
  }

  return Response.json(
    { ratings },
    {
      headers: { "Cache-Control": "public, s-maxage=86400", ...cors },
    },
  );
}
