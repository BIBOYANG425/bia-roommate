// app/api/squad/me/joined/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_joined");
    if (error) return NextResponse.json({ error: "joined_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
