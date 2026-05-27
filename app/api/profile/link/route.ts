import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";
import { profileLinkSchema } from "@/lib/schemas/profile";

export const POST = authedHandler({
  schema: profileLinkSchema,
  handler: async ({ user, supabase, body }) => {
    const { profile_id } = body;

    // Only allow linking a profile that has no owner
    // AND was created in the same session (created_at within last 30 minutes)
    // This prevents users from claiming arbitrary unclaimed profiles
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("roommate_profiles")
      .update({ user_id: user.id })
      .eq("id", profile_id)
      .is("user_id", null)
      .gte("created_at", thirtyMinAgo)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Profile not found, already claimed, or expired" },
        { status: 404 },
      );
    }

    return NextResponse.json({ linked: true, profile_id: data.id });
  },
});
