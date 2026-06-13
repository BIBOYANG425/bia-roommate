// lib/matching/interests.ts
// Onboarding → matching representation (spec §7.6 cold-start, CEO D6).
// Form picks are a controlled vocabulary: picks ARE the tags (no LLM here —
// george-memory prose extraction is Phase 2). Facets = one embedding per pick
// + the free-text + a major/year seed. Embed failure never blocks the tag
// write (spec §11). Mirrors bia-admin/lib/matching/vector-builder semantics.
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

export interface FormInterests {
  categories: string[];
  freeText: string;
  major: string | null;
  year: string | null;
}

export interface MatchingProfileResult { tags: number; facets: number; embedded: boolean }

export const formTagsFrom = (categories: string[]): string[] =>
  categories
    .map((c) => c.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((t) => t.length > 1);

export function makeEmbedClient(supabaseUrl: string, serviceKey: string): EmbedFn {
  return async (texts: string[]) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!res || !res.ok) throw new Error("embed_unavailable");
    const data = await res.json().catch(() => null);
    if (!data || data.dim !== 1536 || !Array.isArray(data.embeddings) ||
        data.embeddings.length !== texts.length) throw new Error("embed_unavailable");
    return data.embeddings as number[][];
  };
}

export async function buildMatchingProfile(
  admin: SupabaseClient,
  studentId: string,
  form: FormInterests,
  embed: EmbedFn,
): Promise<MatchingProfileResult> {
  const tags = formTagsFrom(form.categories);
  const { error: tagErr } = await admin
    .from("students").update({ interest_tags: tags }).eq("id", studentId);
  if (tagErr) throw new Error(`tag write failed: ${tagErr.message}`);

  const facetTexts: { label: string; text: string }[] = [
    ...tags.map((t) => ({ label: t, text: t.replace(/_/g, " ") })),
    ...(form.freeText.trim() ? [{ label: "about_me", text: `about me: ${form.freeText.trim()}` }] : []),
    ...(form.major || form.year
      ? [{ label: "academic_seed", text: `${form.major ?? "USC"} student, ${form.year ?? "current"} year at USC` }]
      : []),
  ].slice(0, 8); // facet cap, spec §7.3

  if (facetTexts.length === 0) return { tags: 0, facets: 0, embedded: false };

  let vectors: number[][];
  try {
    vectors = await embed(facetTexts.map((f) => f.text));
  } catch {
    return { tags: tags.length, facets: facetTexts.length, embedded: false };
  }

  const { error: upErr } = await admin.from("user_interest_vectors").upsert(
    facetTexts.map((f, i) => ({
      student_id: studentId, label: f.label, vector: JSON.stringify(vectors[i]),
      source: "onboarding", updated_at: new Date().toISOString(),
    })),
    { onConflict: "student_id,label" } as never,
  );
  if (upErr) throw new Error(`vector upsert failed: ${upErr.message}`);
  return { tags: tags.length, facets: facetTexts.length, embedded: true };
}
