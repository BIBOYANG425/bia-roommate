// app/api/squad/me/pings/route.ts
import { NextResponse } from "next/server";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_pings");
    if (error) return NextResponse.json({ error: "pings_unavailable" }, { status: 502 });
    return NextResponse.json(data ?? []);
  },
});
