import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_IDS = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileIds = [
    ...new Set(
      (searchParams.get("ids") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (profileIds.length === 0) {
    return NextResponse.json({});
  }

  if (profileIds.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many ids (max ${MAX_IDS})` },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("profile_likes")
    .select("profile_id")
    .in("profile_id", profileIds);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.profile_id] = (counts[row.profile_id] || 0) + 1;
  }

  return NextResponse.json(counts);
}
