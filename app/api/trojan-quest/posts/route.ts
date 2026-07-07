import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("trojan_quest_posts")
    .select("id, location_id, content, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { location_id, content, author_name } = body as Record<string, string>;

  if (!location_id || !content?.trim()) {
    return Response.json({ error: "Missing location_id or content" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trojan_quest_posts")
    .insert({
      location_id,
      content: content.trim(),
      author_name: author_name?.trim() || "Trojan Explorer",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
