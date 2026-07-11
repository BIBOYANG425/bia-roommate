import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { likeIntentSchema } from "@/lib/schemas/likes";

export const PUT = authedHandler({
  schema: likeIntentSchema,
  rateLimit: { key: "likes", limit: 30, windowMs: 60_000 },
  handler: async ({ user, supabase, body }) => {
    const { profile_id } = body;

    const { error } = await supabase
      .from("profile_likes")
      .upsert(
        { user_id: user.id, profile_id },
        { onConflict: "user_id,profile_id", ignoreDuplicates: true },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ liked: true });
  },
});

export const DELETE = authedHandler({
  schema: likeIntentSchema,
  rateLimit: { key: "likes", limit: 30, windowMs: 60_000 },
  handler: async ({ user, supabase, body }) => {
    const { error } = await supabase
      .from("profile_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("profile_id", body.profile_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ liked: false });
  },
});
