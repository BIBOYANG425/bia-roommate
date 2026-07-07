import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// GET — load the current user's checkins
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("trojan_quest_checkins")
    .select("id, task_id, photo_url, is_public, created_at")
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST — upload photo + save checkin record
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file    = formData.get("photo")  as File | null;
  const taskId  = formData.get("taskId") as string | null;
  const isPublic = formData.get("isPublic") !== "false";

  if (!file || !taskId)
    return Response.json({ error: "Missing photo or taskId" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return Response.json({ error: "File must be an image" }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const ext   = file.name.split(".").pop() ?? "jpg";
  const path  = `checkins/${user.id}/${taskId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("trojan-quest")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError)
    return Response.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("trojan-quest").getPublicUrl(path);

  // Upsert so re-uploading replaces the old record
  const { data, error: dbError } = await supabase
    .from("trojan_quest_checkins")
    .upsert(
      { user_id: user.id, task_id: taskId, photo_url: publicUrl, photo_path: path, is_public: isPublic },
      { onConflict: "user_id,task_id" }
    )
    .select("id, photo_url, is_public")
    .single();

  if (dbError)
    return Response.json({ error: dbError.message }, { status: 500 });

  return Response.json(data);
}

// DELETE — remove checkin photo and DB record
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { checkinId } = await request.json();
  if (!checkinId)
    return Response.json({ error: "Missing checkinId" }, { status: 400 });

  // Fetch record first to get path (also verifies ownership via RLS)
  const { data: record, error: fetchError } = await supabase
    .from("trojan_quest_checkins")
    .select("photo_path")
    .eq("id", checkinId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !record)
    return Response.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminSupabaseClient();
  await admin.storage.from("trojan-quest").remove([record.photo_path]);

  const { error: deleteError } = await supabase
    .from("trojan_quest_checkins")
    .delete()
    .eq("id", checkinId)
    .eq("user_id", user.id);

  if (deleteError)
    return Response.json({ error: deleteError.message }, { status: 500 });

  return Response.json({ ok: true });
}

// PATCH — toggle public/private
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { checkinId, isPublic } = await request.json();
  if (!checkinId || typeof isPublic !== "boolean")
    return Response.json({ error: "Missing checkinId or isPublic" }, { status: 400 });

  const { error } = await supabase
    .from("trojan_quest_checkins")
    .update({ is_public: isPublic })
    .eq("id", checkinId)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
