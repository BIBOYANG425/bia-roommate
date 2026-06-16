// app/api/squad/me/posts/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_posts");
    if (error) return NextResponse.json({ error: "posts_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
