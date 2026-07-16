import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidTrojanQuestLocationId } from "@/lib/trojan-quest/locations";

const MAX_CONTENT_LEN = 500;
const MAX_AUTHOR_LEN = 60;

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
  const { location_id, content, author_name } = body as Record<string, unknown>;

  // location_id must be one of the fixed Trojan Quest locations.
  if (!isValidTrojanQuestLocationId(location_id)) {
    return Response.json({ error: "Invalid location_id" }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "Missing or invalid content" }, { status: 400 });
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_CONTENT_LEN) {
    return Response.json(
      { error: `Content too long (max ${MAX_CONTENT_LEN} characters)` },
      { status: 400 },
    );
  }

  const authorName =
    typeof author_name === "string" && author_name.trim()
      ? author_name.trim().slice(0, MAX_AUTHOR_LEN)
      : "Trojan Explorer";

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trojan_quest_posts")
    .insert({
      location_id,
      content: trimmedContent,
      author_name: authorName,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
