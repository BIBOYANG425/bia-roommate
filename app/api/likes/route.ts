import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { likeToggleSchema } from "@/lib/schemas/likes";

export const POST = authedHandler({
  schema: likeToggleSchema,
  rateLimit: { key: "likes", limit: 30, windowMs: 60_000 },
  handler: async ({ user, supabase, body }) => {
    const { profile_id } = body;

    const { error } = await supabase
      .from("profile_likes")
      .insert({ user_id: user.id, profile_id });

    if (error?.code === "23505") {
      const { error: deleteError } = await supabase
        .from("profile_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("profile_id", profile_id);
      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ liked: false });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ liked: true });
  },
});
