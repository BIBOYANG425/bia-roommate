import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SQUAD_CATEGORIES, SQUAD_GENDER_OPTIONS } from "@/lib/types";

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

  const trimmedPosterName = poster_name?.trim() ?? "";
  const trimmedCategory = category?.trim() ?? "";
  const trimmedContent = content?.trim() ?? "";
  const trimmedContact = contact?.trim() ?? "";
  const trimmedSchool = school?.trim() ?? "";
  const trimmedLocation = location?.trim() ?? "";
  const trimmedGender = gender_restriction?.trim() || "不限";

  if (
    !trimmedPosterName ||
    !trimmedCategory ||
    !trimmedContent ||
    !trimmedContact
  )
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );

  if (!(SQUAD_CATEGORIES as readonly string[]).includes(trimmedCategory))
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  if (!(SQUAD_GENDER_OPTIONS as readonly string[]).includes(trimmedGender))
    return NextResponse.json(
      { error: "Invalid gender_restriction" },
      { status: 400 },
    );

  const parsedMaxPeople = parseInt(String(max_people), 10);
  if (isNaN(parsedMaxPeople) || parsedMaxPeople < 1 || parsedMaxPeople > 50)
    return NextResponse.json(
      { error: "max_people must be between 1 and 50" },
      { status: 400 },
    );

  const { data, error } = await supabase
    .from("squad_posts")
    .insert({
      user_id: user.id,
      poster_name: trimmedPosterName,
      school: trimmedSchool || null,
      category: trimmedCategory,
      content: trimmedContent,
      location: trimmedLocation || null,
      max_people: parsedMaxPeople,
      current_people: 1,
      deadline: deadline || null,
      gender_restriction: trimmedGender,
      contact: trimmedContact,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
