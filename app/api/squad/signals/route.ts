// app/api/squad/signals/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authedHandler } from "@/lib/api/authed-handler";

export const GET = authedHandler({
  handler: async ({ supabase }) => {
    const { data, error } = await supabase.rpc("squad_my_signals");
    if (error) return NextResponse.json({ error: "signals_unavailable" }, { status: 502 });
    return NextResponse.json((data ?? [])[0] ?? { interest_tags: [], facets: [] });
  },
});

const tagSchema = z.object({ tag: z.string().trim().min(1).max(40) });

export const POST = authedHandler({
  schema: tagSchema,
  handler: async ({ supabase, body }) => {
    let vector: number[] | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("embed", { body: { texts: [body.tag] } });
      if (!error && Array.isArray(data?.embeddings?.[0])) vector = data.embeddings[0] as number[];
    } catch { /* embed unavailable — tag is still added (tag-overlap leg), facet skipped */ }
    const { error } = await supabase.rpc("squad_add_interest", { p_tag: body.tag, p_vector: vector });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, embedded: vector !== null });
  },
});

export const DELETE = authedHandler({
  schema: tagSchema,
  handler: async ({ supabase, body }) => {
    const { error } = await supabase.rpc("squad_remove_interest", { p_tag: body.tag });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
});
