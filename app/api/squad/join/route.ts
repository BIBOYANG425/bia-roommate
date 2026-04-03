import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id } = await request.json();
  if (!post_id)
    return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

  const { data: existing } = await supabase
    .from("squad_members")
    .select("id")
    .eq("post_id", post_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Leave: delete member row; trigger decrements current_people
    const { error: deleteError } = await supabase
      .from("squad_members")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", user.id);

    if (deleteError)
      return NextResponse.json({ error: "Failed to leave squad" }, { status: 500 });

    const { data: updatedPost, error: fetchError } = await supabase
      .from("squad_posts")
      .select("current_people")
      .eq("id", post_id)
      .single();

    if (fetchError)
      return NextResponse.json({ error: "Failed to fetch squad" }, { status: 500 });

    return NextResponse.json({ joined: false, current_people: updatedPost.current_people });
  }

  // Join: trigger checks capacity + increments current_people atomically
  const { error: insertError } = await supabase
    .from("squad_members")
    .insert({ post_id, user_id: user.id });

  if (insertError) {
    if (insertError.message?.includes("squad_full"))
      return NextResponse.json({ error: "已满员" }, { status: 400 });
    if (insertError.message?.includes("post_not_found") || insertError.code === "23503")
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (insertError.code === "23505")
      return NextResponse.json({ error: "Already joined" }, { status: 409 });
    return NextResponse.json({ error: "Failed to join squad" }, { status: 500 });
  }

  const { data: updatedPost, error: fetchError } = await supabase
    .from("squad_posts")
    .select("current_people")
    .eq("id", post_id)
    .single();

  if (fetchError)
    return NextResponse.json({ error: "Failed to fetch squad" }, { status: 500 });

  return NextResponse.json({ joined: true, current_people: updatedPost.current_people });
}
