import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidTrojanQuestLocationId } from "@/lib/trojan-quest/locations";
import { NextRequest } from "next/server";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

// GET — always returns the latest public photo per task (no id, visible to all).
//        If authenticated, also returns own checkins (with id, for management).
//        Own checkin takes precedence over the public preview for the same task.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminSupabaseClient();

  // Fetch latest public photo per task (works for everyone)
  const { data: publicRows } = await admin
    .from("trojan_quest_checkins")
    .select("task_id, photo_url")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const publicByTask = new Map<string, string>();
  for (const r of publicRows ?? []) {
    if (!publicByTask.has(r.task_id)) publicByTask.set(r.task_id, r.photo_url);
  }

  if (!user) {
    return Response.json(
      Array.from(publicByTask.entries()).map(([task_id, photo_url]) => ({ task_id, photo_url }))
    );
  }

  // Authenticated: fetch own checkins (these carry `id` so the user can manage them)
  const { data: ownRows, error } = await supabase
    .from("trojan_quest_checkins")
    .select("id, task_id, photo_url, is_public, created_at")
    .eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ownTaskIds = new Set((ownRows ?? []).map(r => r.task_id));

  // For tasks the user hasn't checked in to, append public previews (no id)
  const publicPreviews = Array.from(publicByTask.entries())
    .filter(([task_id]) => !ownTaskIds.has(task_id))
    .map(([task_id, photo_url]) => ({ task_id, photo_url }));

  return Response.json([...(ownRows ?? []), ...publicPreviews]);
}

// POST — upload photo + save checkin record
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file    = formData.get("photo");
  const taskId  = formData.get("taskId");
  const isPublic = formData.get("isPublic") !== "false";

  // Validate runtime types before touching file properties.
  if (!(file instanceof File) || typeof taskId !== "string" || !taskId)
    return Response.json({ error: "Missing photo or taskId" }, { status: 400 });
  if (!isValidTrojanQuestLocationId(taskId))
    return Response.json({ error: "Invalid taskId" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return Response.json({ error: "File must be an image" }, { status: 400 });
  // Reject oversized uploads before buffering the whole file into memory.
  if (file.size > MAX_PHOTO_BYTES)
    return Response.json({ error: "Image too large (max 10 MB)" }, { status: 413 });

  const admin = createAdminSupabaseClient();

  // Look up any existing check-in so its old photo can be cleaned up after replacing.
  const { data: existing } = await supabase
    .from("trojan_quest_checkins")
    .select("photo_path")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .maybeSingle();

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

  if (dbError) {
    // Roll back the just-uploaded object so it isn't orphaned.
    await admin.storage.from("trojan-quest").remove([path]);
    return Response.json({ error: dbError.message }, { status: 500 });
  }

  // Remove the previous photo now that the record points at the new one.
  if (existing?.photo_path && existing.photo_path !== path)
    await admin.storage.from("trojan-quest").remove([existing.photo_path]);

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
  // Only delete the DB row if the stored object was actually removed, so we
  // never lose the photo_path reference while leaving a public object behind.
  const { error: storageError } = await admin.storage
    .from("trojan-quest")
    .remove([record.photo_path]);

  if (storageError)
    return Response.json({ error: storageError.message }, { status: 500 });

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

  const { data, error } = await supabase
    .from("trojan_quest_checkins")
    .update({ is_public: isPublic })
    .eq("id", checkinId)
    .eq("user_id", user.id)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0)
    return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
