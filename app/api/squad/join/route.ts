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
    await supabase
      .from("squad_members")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", user.id);
    const { data: post } = await supabase
      .from("squad_posts")
      .select("current_people")
      .eq("id", post_id)
      .single();
    if (post) {
      await supabase
        .from("squad_posts")
        .update({ current_people: Math.max(1, post.current_people - 1) })
        .eq("id", post_id);
    }
    return NextResponse.json({ joined: false });
  }

  const { data: post } = await supabase
    .from("squad_posts")
    .select("max_people, current_people")
    .eq("id", post_id)
    .single();

  if (post && post.current_people >= post.max_people)
    return NextResponse.json({ error: "已满员" }, { status: 400 });

  await supabase
    .from("squad_members")
    .insert({ post_id, user_id: user.id });

  if (post) {
    await supabase
      .from("squad_posts")
      .update({ current_people: post.current_people + 1 })
      .eq("id", post_id);
  }
  return NextResponse.json({ joined: true });
}
