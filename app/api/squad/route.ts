import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { squadCreateSchema } from "@/lib/schemas/squad";
import { SQUAD_CATEGORIES, SQUAD_GENDER_OPTIONS } from "@/lib/types";

// GET is intentionally NOT wrapped — squad posts are publicly listable
// (RLS controls per-row visibility).
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("squad_posts_with_status")
    .select("*")
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export const POST = authedHandler({
  schema: squadCreateSchema,
  handler: async ({ user, supabase, body }) => {
    const posterName = body.poster_name.trim();
    const category = body.category.trim();
    const content = body.content.trim();
    const contact = body.contact.trim();
    const school = (body.school ?? "").trim();
    const location = (body.location ?? "").trim();
    const gender = (body.gender_restriction ?? "").trim() || "不限";

    if (!posterName || !category || !content || !contact) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!(SQUAD_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!(SQUAD_GENDER_OPTIONS as readonly string[]).includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender_restriction" },
        { status: 400 },
      );
    }

    const parsedMaxPeople = parseInt(String(body.max_people), 10);
    if (
      isNaN(parsedMaxPeople) ||
      parsedMaxPeople < 2 ||
      parsedMaxPeople > 50
    ) {
      return NextResponse.json(
        { error: "max_people must be between 2 and 50" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("squad_posts")
      .insert({
        user_id: user.id,
        poster_name: posterName,
        school: school || null,
        category,
        content,
        location: location || null,
        max_people: parsedMaxPeople,
        current_people: 1,
        deadline: body.deadline || null,
        gender_restriction: gender,
        contact,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23514") {
        return NextResponse.json(
          { error: "max_people must be between 2 and 50" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});
