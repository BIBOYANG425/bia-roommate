// WeChat distiller — one-shot script.
// Reads a raw JSON export (BIA 2024 group shape: type/timestamp/time/content/sender),
// groups messages into conversation threads, triages each via a lightweight LLM,
// then extracts structured knowledge (campus tips, FAQ pairs, course tips, housing lore)
// via Claude Sonnet, runs a pgvector cosine dedupe against existing rows, and emits
// reviewable SQL INSERT statements (duplicates commented as `-- DUP:`) grouped by
// source thread so a human gate precedes any DB apply.
//
// Usage: tsx scripts/ingest-wechat.ts --input data/wechat/bia-2024.raw.json \
//          [--since 2024-08-01] [--until 2024-10-15] [--max-threads 150] [--dry-run]
//
// Header last reviewed: 2026-04-16

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { callLightweightLLM, getClaudeClient } from '../src/agent/llm-providers.js'
import { supabase } from '../src/db/client.js'
import { embedText } from '../src/tools/campus-knowledge.js'

type RawMessage = Record<string, unknown>

type NormalizedMessage = {
  ts: number
  senderHash: string
  text: string
}

type Thread = {
  id: string
  startTs: number
  messages: NormalizedMessage[]
}

type TriageCategory = 'campus_knowledge' | 'faq' | 'course_tip' | 'housing_lore' | 'noise'

const THREAD_GAP_MS = 15 * 60 * 1000
const TRIAGE_BATCH = 10
const MAX_THREAD_MSGS_IN_PROMPT = 20

type Args = {
  input: string
  output: string
  since: number | null
  until: number | null
  maxThreads: number | null
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const inIdx = args.indexOf('--input')
  if (inIdx < 0 || !args[inIdx + 1]) {
    console.error(
      'Usage: tsx scripts/ingest-wechat.ts --input <raw.json> [--output <out.sql>]\n' +
        '  [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--max-threads N] [--dry-run]',
    )
    process.exit(1)
  }
  const input = args[inIdx + 1]
  const outIdx = args.indexOf('--output')
  const defaultOut = `data/ingest/${new Date().toISOString().slice(0, 10)}-wechat.sql`
  const output = outIdx >= 0 ? args[outIdx + 1] : defaultOut

  const parseDate = (flag: string): number | null => {
    const i = args.indexOf(flag)
    if (i < 0 || !args[i + 1]) return null
    const t = new Date(args[i + 1]).getTime()
    if (!Number.isFinite(t)) {
      console.error(`Invalid date for ${flag}: ${args[i + 1]}`)
      process.exit(1)
    }
    return t
  }
  const since = parseDate('--since')
  // --until: interpret as end-of-day (inclusive upper bound on the given date).
  const untilRaw = parseDate('--until')
  const until = untilRaw === null ? null : untilRaw + 24 * 60 * 60 * 1000 - 1

  const maxIdx = args.indexOf('--max-threads')
  const maxThreads =
    maxIdx >= 0 && args[maxIdx + 1] ? Math.max(1, Number(args[maxIdx + 1])) : null
  if (maxThreads !== null && !Number.isFinite(maxThreads)) {
    console.error(`Invalid --max-threads value: ${args[maxIdx + 1]}`)
    process.exit(1)
  }

  const dryRun = args.includes('--dry-run')

  return { input: resolve(input), output: resolve(output), since, until, maxThreads, dryRun }
}

function hashSender(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 8)
}

// BIA 2024 export shape: { type, timestamp (unix seconds), time ("YYYY-MM-DD HH:MM:SS"),
// sender ("wxid_..."), content ("wxid_...:\n<actual text>") }.
// Tolerant of other exports: if `type` is missing we keep the row; if only `createTime`
// (ms) is present we honor that; we detect second-scale timestamps (< 2e10) and scale up.
function normalize(raw: RawMessage[]): NormalizedMessage[] {
  return raw
    .filter((m) => {
      const t = (m as { type?: unknown }).type
      return t == null || t === 1
    })
    .map((m) => {
      const rawText = String(m.content ?? m.text ?? m.msg ?? '')
      // Strip the `wxid_xxx:\n` (or any `<id>:\n`) prefix baked into BIA 2024 content.
      const text = rawText.replace(/^[^\s:]+:\n/, '').trim()

      const sender = (m.fromUser ?? m.from ?? m.sender ?? m.user ?? 'unknown') as string

      let ts = 0
      if (typeof m.time === 'string') {
        const parsed = new Date(String(m.time).replace(' ', 'T')).getTime()
        if (Number.isFinite(parsed)) ts = parsed
      }
      if (ts === 0 && typeof m.timestamp === 'number') {
        ts = m.timestamp < 2e10 ? m.timestamp * 1000 : m.timestamp
      }
      if (ts === 0 && typeof m.createTime === 'number') {
        ts = m.createTime < 2e10 ? m.createTime * 1000 : m.createTime
      }

      return { ts, senderHash: hashSender(String(sender)), text }
    })
    .filter((m) => m.ts > 0 && m.text.length > 1)
    .sort((a, b) => a.ts - b.ts)
}

function makeThread(messages: NormalizedMessage[]): Thread {
  const hash = createHash('sha256')
    .update(messages.map((m) => m.senderHash + m.text).join('|'))
    .digest('hex')
    .slice(0, 8)
  return { id: hash, startTs: messages[0].ts, messages }
}

function threadify(messages: NormalizedMessage[]): Thread[] {
  const out: Thread[] = []
  let current: NormalizedMessage[] = []
  for (const msg of messages) {
    const last = current[current.length - 1]
    if (!last || msg.ts - last.ts <= THREAD_GAP_MS) {
      current.push(msg)
    } else {
      if (current.length >= 2) out.push(makeThread(current))
      current = [msg]
    }
  }
  if (current.length >= 2) out.push(makeThread(current))
  return out
}

async function triage(threads: Thread[]): Promise<Map<string, TriageCategory>> {
  const result = new Map<string, TriageCategory>()
  const system =
    'You classify WeChat chat threads from a USC freshman group. For each THREAD_N in the input, output exactly one line:\n' +
    'THREAD_N: <category>\n' +
    'Categories:\n' +
    '- campus_knowledge: study spots, dining, buildings, transport, neighborhood tips\n' +
    '- faq: an explicit question followed by answers\n' +
    '- course_tip: specific course or professor mentioned with opinions\n' +
    '- housing_lore: housing, sublet, roommate context or advice\n' +
    '- noise: greetings, chit-chat, media-only, untranslatable slang, off-topic\n' +
    'Output only classification lines. No explanations.'

  for (let i = 0; i < threads.length; i += TRIAGE_BATCH) {
    const batch = threads.slice(i, i + TRIAGE_BATCH)
    const prompt = batch
      .map((t, j) => {
        const sample = t.messages.slice(0, MAX_THREAD_MSGS_IN_PROMPT)
        return `THREAD_${j} (id=${t.id})\n` + sample.map((m) => `  [${m.senderHash}] ${m.text}`).join('\n')
      })
      .join('\n\n')

    const response = await callLightweightLLM(
      [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 500 },
    )

    for (const line of response.split('\n')) {
      const m = line.match(/THREAD_(\d+):\s*(\w+)/)
      if (!m) continue
      const idx = Number(m[1])
      const cat = m[2] as TriageCategory
      const t = batch[idx]
      if (t && ['campus_knowledge', 'faq', 'course_tip', 'housing_lore', 'noise'].includes(cat)) {
        result.set(t.id, cat)
      }
    }
  }
  return result
}

type ExtractedBase =
  | { kind: 'campus_knowledge'; title: string; content: string; category: string }
  | { kind: 'faq'; question: string; answer: string; category: string }
  | { kind: 'course_tip'; course_code: string | null; professor: string | null; tip: string; sentiment: string }
  | { kind: 'housing_lore'; title: string; content: string }

type Extracted = ExtractedBase & { duplicate?: boolean }

// Cosine-distance threshold below which an extracted item is treated as a duplicate
// of an existing row. pgvector returns distances in [0, 2]; 0.15 ≈ very close neighbors.
const DEDUPE_COSINE_THRESHOLD = 0.15

// Target table per Extracted kind. `housing_lore` shares the campus_knowledge table.
function targetTable(kind: Extracted['kind']): 'campus_knowledge' | 'freshman_faq' | 'course_tips' {
  if (kind === 'faq') return 'freshman_faq'
  if (kind === 'course_tip') return 'course_tips'
  return 'campus_knowledge'
}

// Key text used both for embedding and for readable logs. Mirrors the text that a
// search query would hit: title+content / question+answer / course+tip.
function dedupeKeyText(it: ExtractedBase): string {
  switch (it.kind) {
    case 'campus_knowledge':
    case 'housing_lore':
      return `${it.title}\n${it.content}`
    case 'faq':
      return `${it.question}\n${it.answer}`
    case 'course_tip':
      return [it.course_code, it.professor, it.tip].filter(Boolean).join(' | ')
  }
}

// PostgREST doesn't expose pgvector's `<=>` operator, and migration 003 defines
// no `match_*` RPC yet. For a one-shot distiller run we just pull existing
// embeddings into memory and compute cosine distance client-side. At O(seed rows
// + prior ingests) this is negligible even after several runs.
type ExistingRow = { embedding: number[] }
const existingEmbeddingsCache = new Map<string, ExistingRow[]>()

function parsePgVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown
      if (Array.isArray(parsed)) return parsed as number[]
    } catch {
      // pgvector may serialize as "[0.1,0.2,...]" which JSON.parse handles; fall through.
    }
  }
  return null
}

async function loadExisting(table: string): Promise<ExistingRow[]> {
  const cached = existingEmbeddingsCache.get(table)
  if (cached) return cached
  const { data, error } = await supabase.from(table).select('embedding').not('embedding', 'is', null)
  if (error || !data) {
    console.warn(`[ingest] could not preload embeddings for ${table}: ${error?.message ?? 'no data'}`)
    existingEmbeddingsCache.set(table, [])
    return []
  }
  const rows = data
    .map((r) => ({ embedding: parsePgVector((r as { embedding: unknown }).embedding) }))
    .filter((r): r is ExistingRow => r.embedding !== null && r.embedding.length > 0)
  existingEmbeddingsCache.set(table, rows)
  return rows
}

function cosineDistance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom === 0) return 1
  return 1 - dot / denom
}

async function isDuplicate(it: ExtractedBase, embedding: number[]): Promise<boolean> {
  const rows = await loadExisting(targetTable(it.kind))
  for (const r of rows) {
    if (cosineDistance(embedding, r.embedding) < DEDUPE_COSINE_THRESHOLD) return true
  }
  return false
}

async function tagDuplicates(items: Extracted[]): Promise<Extracted[]> {
  if (items.length === 0) return items
  const out: Extracted[] = []
  for (const it of items) {
    const key = dedupeKeyText(it)
    let embedding: number[] | null = null
    try {
      embedding = await embedText(key)
    } catch (err) {
      console.warn(`[ingest] embed failed for ${it.kind}: ${(err as Error).message}`)
    }
    if (!embedding) {
      // No embedding available (e.g. OPENAI_API_KEY unset); skip dedupe for this item.
      out.push(it)
      continue
    }
    let dup = false
    try {
      dup = await isDuplicate(it, embedding)
    } catch (err) {
      console.warn(`[ingest] dedupe query failed for ${it.kind}: ${(err as Error).message}`)
    }
    out.push({ ...it, duplicate: dup })
  }
  return out
}

const EXTRACT_INSTRUCTIONS: Record<Exclude<TriageCategory, 'noise'>, string> = {
  campus_knowledge:
    'Extract 0-3 distinct campus tips (study spots, food, buildings, transport, neighborhood). ' +
    'Output strict JSON: {"items":[{"title":"...","content":"...","category":"food|study|buildings|tips|local|transport"}]}',
  faq:
    'Extract 0-3 Q&A pairs where a freshman asked and a senior answered. ' +
    'Output strict JSON: {"items":[{"question":"...","answer":"...","category":"housing|academics|social|admin|food|general"}]}',
  course_tip:
    'Extract 0-3 course/professor tips. If course code or professor is not clearly identified use null. ' +
    'Output strict JSON: {"items":[{"course_code":"e.g. CSCI 103 or null","professor":"surname or null","tip":"...","sentiment":"positive|mixed|negative"}]}',
  housing_lore:
    'Extract 0-3 housing-related tips (neighborhoods, landlords, commute). ' +
    'Output strict JSON: {"items":[{"title":"...","content":"..."}]}',
}

async function extract(thread: Thread, category: TriageCategory): Promise<Extracted[]> {
  if (category === 'noise') return []
  const claude = getClaudeClient()
  const transcript = thread.messages.map((m) => `[${m.senderHash}] ${m.text}`).join('\n')
  const system =
    'You distill USC-specific wisdom from casual WeChat chat threads into structured JSON. ' +
    'Preserve the original Chinese/English mix. Skip items that are vague, stale-looking, or contain personal identifiers (names, phone numbers, emails, WeChat IDs). ' +
    'Return STRICT JSON only, no prose, no markdown fences.\n\n' +
    EXTRACT_INSTRUCTIONS[category]

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: `Thread ${thread.id}:\n${transcript}` }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as { items?: Array<Record<string, unknown>> }
    const items = parsed.items ?? []
    return items.map((it) => ({ kind: category, ...it })) as Extracted[]
  } catch {
    console.warn(`[ingest] extract parse failed for thread ${thread.id}`)
    return []
  }
}

function sqlEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'null'
  return `'${String(s).replace(/'/g, "''")}'`
}

function insertSql(it: Extracted, thread: Thread): string {
  switch (it.kind) {
    case 'campus_knowledge':
      return `insert into campus_knowledge (category, title, content) values (${sqlEscape(it.category)}, ${sqlEscape(it.title)}, ${sqlEscape(it.content)});`
    case 'housing_lore':
      return `insert into campus_knowledge (category, title, content) values ('local', ${sqlEscape(it.title)}, ${sqlEscape(it.content)});`
    case 'faq':
      return `insert into freshman_faq (question, answer, category, source_thread_id) values (${sqlEscape(it.question)}, ${sqlEscape(it.answer)}, ${sqlEscape(it.category)}, ${sqlEscape(thread.id)});`
    case 'course_tip':
      return `insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values (${sqlEscape(it.course_code)}, ${sqlEscape(it.professor)}, ${sqlEscape(it.tip)}, ${sqlEscape(it.sentiment)}, ${sqlEscape(thread.id)});`
  }
}

function toSqlBlock(thread: Thread, items: Extracted[]): string {
  const header = `-- thread ${thread.id} | ${new Date(thread.startTs).toISOString().slice(0, 10)} | ${thread.messages.length} msgs\n`
  if (items.length === 0) return ''
  const rows = items.map((it) => {
    const stmt = insertSql(it, thread)
    return it.duplicate ? `-- DUP: ${stmt}` : stmt
  })
  return header + rows.join('\n') + '\n\n'
}

async function main() {
  const { input, output, since, until, maxThreads, dryRun } = parseArgs()
  console.log(`[ingest] loading ${input}`)
  const raw = JSON.parse(readFileSync(input, 'utf8')) as
    | RawMessage[]
    | { messages?: RawMessage[] }
  // BIA 2024 export wraps messages in `{ chatroom, name, messages: [...] }`;
  // legacy JettChenT export is a bare array. Accept both and hard-fail on
  // neither — silently normalizing 0 messages would mask a wrong --input path.
  const messages: RawMessage[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.messages)
      ? raw.messages
      : []
  if (messages.length === 0) {
    console.error('[ingest] no messages found at top level or .messages')
    process.exit(1)
  }

  const normalized = normalize(messages)
  console.log(`[ingest] ${normalized.length} messages after normalize`)

  let threads = threadify(normalized)
  console.log(`[ingest] ${threads.length} threads (>=2 msgs, 15-min gap)`)

  if (since !== null || until !== null) {
    const before = threads.length
    threads = threads.filter((t) => {
      if (since !== null && t.startTs < since) return false
      if (until !== null && t.startTs > until) return false
      return true
    })
    console.log(
      `[ingest] time-window filter (${since !== null ? new Date(since).toISOString().slice(0, 10) : '*'} → ${
        until !== null ? new Date(until).toISOString().slice(0, 10) : '*'
      }): ${before} → ${threads.length} threads`,
    )
  }

  const categories = await triage(threads)
  const distribution = new Map<string, number>()
  for (const c of categories.values()) distribution.set(c, (distribution.get(c) ?? 0) + 1)
  console.log(`[ingest] triage distribution:`, Object.fromEntries(distribution))

  let productive = threads.filter((t) => {
    const c = categories.get(t.id)
    return c && c !== 'noise'
  })

  if (maxThreads !== null && productive.length > maxThreads) {
    // Prioritize longer threads (more signal per LLM call).
    productive = productive
      .slice()
      .sort((a, b) => b.messages.length - a.messages.length)
      .slice(0, maxThreads)
    console.log(`[ingest] capped productive threads to top ${maxThreads} by message count`)
  }

  console.log(`[ingest] ${productive.length} productive threads to extract`)

  if (dryRun) {
    console.log('[ingest] --dry-run: skipping extract + SQL output')
    return
  }

  const blocks: string[] = []
  let rowCount = 0
  let dupCount = 0
  for (const t of productive) {
    const cat = categories.get(t.id)!
    const rawItems = await extract(t, cat)
    if (rawItems.length === 0) continue
    const items = await tagDuplicates(rawItems)
    blocks.push(toSqlBlock(t, items))
    rowCount += items.length
    dupCount += items.filter((it) => it.duplicate).length
  }

  mkdirSync(dirname(output), { recursive: true })
  const preamble =
    `-- WeChat ingest — ${new Date().toISOString()}\n` +
    `-- Source: ${input}\n` +
    `-- Threads: ${threads.length} total, ${productive.length} productive, ${rowCount} candidate rows (${dupCount} flagged as -- DUP)\n` +
    `-- REVIEW each block before applying. Delete or edit rows as needed.\n\n`
  writeFileSync(output, preamble + blocks.join(''))
  console.log(
    `[ingest] wrote ${rowCount} rows (${dupCount} dups) across ${blocks.length} thread blocks → ${output}`,
  )
}

main().catch((err) => {
  console.error('[ingest] fatal:', err)
  process.exit(1)
})
