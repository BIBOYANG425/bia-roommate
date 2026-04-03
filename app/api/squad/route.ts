import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("squad_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    poster_name,
    school,
    category,
    content,
    location,
    max_people,
    deadline,
    gender_restriction,
    contact,
  } = body;

  if (!poster_name || !category || !content || !contact)
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("squad_posts")
    .insert({
      user_id: user.id,
      poster_name,
      school: school || null,
      category,
      content,
      location: location || null,
      max_people: Number(max_people) || 2,
      current_people: 1,
      deadline: deadline || null,
      gender_restriction: gender_restriction || "不限",
      contact: contact || null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
