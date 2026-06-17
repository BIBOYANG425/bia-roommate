// app/api/squad/prefs/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_prefs");
    if (error) return NextResponse.json({ error: "prefs_unavailable" }, { status: 502 });
    return NextResponse.json(data);
  },
});

const putSchema = z.object({
  pings_enabled: z.boolean(),
  allowed_categories: z.array(z.string()).nullable(),
  weekly_ping_cap: z.number().int().min(0).max(50),
  quiet_start_hour: z.number().int().min(0).max(23),
  quiet_end_hour: z.number().int().min(0).max(23),
  channel: z.enum(["imessage", "web", "email"]),
});

export const PUT = authedHandler({
  schema: putSchema,
  handler: async ({ supabase, body }) => {
    const { data, error } = await supabase.rpc("squad_set_prefs", {
      p_pings_enabled: body.pings_enabled,
      p_allowed_categories: body.allowed_categories,
      p_weekly_cap: body.weekly_ping_cap,
      p_quiet_start: body.quiet_start_hour,
      p_quiet_end: body.quiet_end_hour,
      p_channel: body.channel,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
});
