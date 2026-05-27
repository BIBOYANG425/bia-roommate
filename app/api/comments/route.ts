import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import {
  commentCreateSchema,
  commentDeleteSchema,
} from "@/lib/schemas/comments";

export const POST = authedHandler({
  schema: commentCreateSchema,
  rateLimit: { key: "comments", limit: 10, windowMs: 60_000 },
  handler: async ({ user, supabase, body }) => {
    const { profile_id, content } = body;

    const { data, error } = await supabase
      .from("profile_comments")
      .insert({ user_id: user.id, profile_id, content })
      .select("id, content, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  },
});

export const DELETE = authedHandler({
  schema: commentDeleteSchema,
  handler: async ({ user, supabase, body }) => {
    const { id } = body;

    const { error } = await supabase
      .from("profile_comments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  },
});
