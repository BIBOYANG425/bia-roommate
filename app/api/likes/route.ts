import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile_id } = await request.json();
  if (!profile_id)
    return NextResponse.json({ error: "Missing profile_id" }, { status: 400 });

  const { error } = await supabase
    .from("profile_likes")
    .insert({ user_id: user.id, profile_id });

  if (error?.code === "23505") {
    // Already liked — unlike
    const { error: deleteError } = await supabase
      .from("profile_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("profile_id", profile_id);
    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    return NextResponse.json({ liked: false });
  }

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ liked: true });
}
