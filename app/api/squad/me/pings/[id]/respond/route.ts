// app/api/squad/me/pings/[id]/respond/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";
import { respondStatusForError } from "./parse";

const schema = z.object({ response: z.enum(["joined", "declined"]) });

export const POST = authedHandler<typeof schema, { id: string }>({
  schema,
  handler: async ({ supabase, params, body }) => {
    const { error } = await supabase.rpc("squad_respond_to_ping", {
      p_ping_id: params.id, p_response: body.response,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: respondStatusForError(error.message) });
    return NextResponse.json({ ok: true });
  },
});
