/**
 * Search fallback for knowledge tools.
 *
 * Postgres FTS with default English config does not tokenize CJK content well
 * and misses short acronyms (e.g. "IYA", "DPS") even when they appear verbatim
 * in the stored text. We therefore try FTS first (cheap, ranked) and fall back
 * to an ILIKE substring match across multiple columns when FTS returns zero
 * hits. The fallback is per-tool-call, not a global OR — it only runs on miss,
 * so well-tokenized queries pay no extra cost.
 *
 * Internal types are intentionally loose (the supabase-js filter builder's
 * generic parameters are difficult to thread through a reusable helper).
 * The returned array is still strongly typed at the call site.
 *
 * Header last reviewed: 2026-04-17
 */
import { supabase } from '../db/client.js'

// The supabase-js filter builder returns a new builder from each chained call;
// internally we treat it as an opaque "something you can call .eq/.ilike/.or
// on". Callers see fully-typed result rows via the generic R.
type AnyFilterBuilder = {
  eq: (...args: unknown[]) => AnyFilterBuilder
  ilike: (...args: unknown[]) => AnyFilterBuilder
  or: (...args: unknown[]) => AnyFilterBuilder
  textSearch: (...args: unknown[]) => AnyFilterBuilder
  limit: (n: number) => AnyFilterBuilder
}

export type SearchFilters = (q: AnyFilterBuilder) => AnyFilterBuilder

export async function searchWithFallback<R>(
  table: string,
  select: string,
  query: string,
  opts: {
    ftsColumn: string
    ilikeColumns: string[]
    limit?: number
    applyFilters?: SearchFilters
  },
): Promise<R[] | null> {
  const limit = opts.limit ?? 5

  const buildBase = () => {
    const b = supabase.from(table).select(select).limit(limit) as unknown as AnyFilterBuilder
    return opts.applyFilters ? opts.applyFilters(b) : b
  }

  // Attempt 1: FTS (ranked, cheap, but CJK-blind).
  const q1 = buildBase().textSearch(
    opts.ftsColumn,
    query.split(/\s+/).filter(Boolean).join(' & '),
    { type: 'plain' },
  )
  const res1 = (await (q1 as unknown as Promise<{ data: R[] | null; error: unknown }>))
  if (!res1.error && res1.data && res1.data.length > 0) return res1.data

  // Attempt 2: ILIKE across the configured columns. Escape punctuation that
  // would break PostgREST's or-filter grammar.
  const escaped = query.replace(/[(),]/g, ' ').trim()
  if (!escaped) return res1.data ?? null
  const likeExpr = opts.ilikeColumns.map((c) => `${c}.ilike.%${escaped}%`).join(',')
  const q2 = buildBase().or(likeExpr)
  const res2 = (await (q2 as unknown as Promise<{ data: R[] | null; error: unknown }>))
  if (res2.error) return res1.data ?? null
  return res2.data
}
