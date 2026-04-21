// One-shot scraper: USC catalogue (catalogue.usc.edu) → structured `courses`/`programs` tables
// in Supabase. Programs + schools are *also* mirrored into `campus_knowledge` (category='usc_program'
// / 'usc_school') so George's campus sub-agent can RAG-retrieve them. Courses stay structured-only
// to avoid diluting RAG with 13k formulaic seminar/dissertation rows.
//
// Phases (resumable via on-disk checkpoints in data/ingest/catalogue/):
//   index           → list of {dept, code, title, coid} for all courses (walks A-Z index)
//   school_groups   → Map<poid, school> derived from navoid=8930 ("Programs by School")
//   details         → per-course parsed fields (with retry + validation)
//   programs        → per-program parsed fields (with retry + validation, school joined in)
//   schools         → per-school descriptions (navoid=8862 "Schools and Academic Units")
//   insert          → upsert structured rows; mirror programs+schools into campus_knowledge
//
// Run: npx tsx scripts/ingest-catalogue.ts [--phase=all|<name>] [--limit=N]
//
// Header last reviewed: 2026-04-20

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { supabase } from '../src/db/client.js'

// --------------------------------------
// CONFIG
// --------------------------------------

const CATOID = 21
const COURSES_NAV = 8861
const PROGRAMS_NAV = 8873
const PROGRAMS_BY_SCHOOL_NAV = 8930
const SCHOOLS_NAV = 8862
const BASE = 'https://catalogue.usc.edu'
const UA = 'Mozilla/5.0 BIA-George-Catalogue-Ingest (contact: bia@usc.edu)'
const CHECKPOINT_DIR = 'data/ingest/catalogue'
const THROTTLE_MS = 500
const CONCURRENCY = 2
const EMBED_BATCH = 100
const MAX_RETRIES = 3

type CourseIndex = { dept: string; code: string; title: string; coid: string }
type CourseDetail = CourseIndex & {
  description: string
  units?: string
  terms?: string
  prereq?: string
  corequisite?: string
  recommended_prep?: string
  restriction?: string
  grading?: string
  mode?: string
  crosslisted?: string
}
type Program = {
  poid: string
  name: string
  degree_type?: string
  school?: string
  description: string
  href: string
}
type School = {
  ent_oid: string
  name: string
  description: string
}

// --------------------------------------
// UTILITIES
// --------------------------------------

function ensureDir() {
  mkdirSync(CHECKPOINT_DIR, { recursive: true })
}

function loadJson<T>(file: string, fallback: T): T {
  const path = join(CHECKPOINT_DIR, file)
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

function saveJson(file: string, data: unknown) {
  writeFileSync(join(CHECKPOINT_DIR, file), JSON.stringify(data, null, 2))
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function fetchAndValidate(url: string, needle: string): Promise<string> {
  // Acalog occasionally returns a throttled/error page that omits the content needle.
  // Retry up to MAX_RETRIES with exponential backoff.
  let lastErr: Error | null = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const html = await fetchHtml(url)
      const first = html.indexOf(needle)
      const second = first >= 0 ? html.indexOf(needle, first + 1) : -1
      if (second >= 0) return html
      lastErr = new Error(`needle "${needle}" not found in ${url}`)
    } catch (err) {
      lastErr = err as Error
    }
    await sleep(500 * Math.pow(2, attempt))
  }
  throw lastErr ?? new Error(`fetchAndValidate exhausted for ${url}`)
}

function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function runPool<T>(
  items: T[],
  worker: (item: T, idx: number) => Promise<void>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let nextIdx = 0
  let done = 0
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = nextIdx++
      if (idx >= items.length) return
      try {
        await worker(items[idx], idx)
      } catch (err) {
        console.error(`[pool] item ${idx} failed:`, (err as Error).message)
      }
      done++
      if (onProgress && done % 50 === 0) onProgress(done, items.length)
      await sleep(THROTTLE_MS)
    }
  })
  await Promise.all(runners)
  if (onProgress) onProgress(done, items.length)
}

// --------------------------------------
// PARSER: shared line-split helper
// --------------------------------------

function blockToLines(raw: string): string[] {
  const lined = raw
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<hr\s*\/?\s*>/gi, '\n')
    .replace(/<\/h\d>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
  return lined
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/[ \t\r]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

// --------------------------------------
// PHASE 1: INDEX — walk alphabetical course listing
// --------------------------------------

async function phaseIndex(): Promise<CourseIndex[]> {
  const cache = loadJson<CourseIndex[]>('index.json', [])
  if (cache.length > 0) {
    console.log(`[index] resumed from cache: ${cache.length} courses`)
    return cache
  }

  const courses: CourseIndex[] = []
  let page = 1
  const COURSE_RE = /href="(preview_course_nopop\.php\?catoid=\d+&coid=(\d+))"[^>]*>\s*([A-Z]{2,5})\s+(\d+[A-Za-z]*)\s+([^<]+?)</g

  while (true) {
    const url = `${BASE}/content.php?catoid=${CATOID}&navoid=${COURSES_NAV}&filter%5Bcpage%5D=${page}`
    console.log(`[index] fetching page ${page}...`)
    const html = await fetchHtml(url)
    const before = courses.length
    for (const m of html.matchAll(COURSE_RE)) {
      courses.push({ coid: m[2], dept: m[3], code: m[4], title: cleanText(m[5]) })
    }
    const found = courses.length - before
    if (found === 0) {
      console.log(`[index] page ${page} returned 0 — stopping`)
      break
    }
    console.log(`[index] page ${page}: +${found} (total ${courses.length})`)
    page++
    await sleep(THROTTLE_MS)
    if (page > 200) break
  }

  saveJson('index.json', courses)
  return courses
}

// --------------------------------------
// PHASE 2: SCHOOL GROUPS — scrape navoid=8930 to derive school per program
// --------------------------------------

async function phaseSchoolGroups(): Promise<Record<string, string>> {
  const cached = loadJson<Record<string, string>>('school_groups.json', {})
  if (Object.keys(cached).length > 0) {
    console.log(`[school_groups] resumed from cache: ${Object.keys(cached).length} poid→school mappings`)
    return cached
  }

  const url = `${BASE}/content.php?catoid=${CATOID}&navoid=${PROGRAMS_BY_SCHOOL_NAV}`
  console.log(`[school_groups] fetching: ${url}`)
  const html = await fetchHtml(url)

  // navoid=8930 has <h2 id="entXXXX">School Name</h2> followed by a preview_entity.php link and
  // then the school's program list. Parse the h2 headings as our source of truth for the school
  // list (including ent_oid for fetching school descriptions later).
  const H2_RE = /<h2[^>]+id="ent(\d+)"[^>]*>\s*([^<]{3,180}?)\s*<\/h2>/g
  const PROG_RE = /href="(preview_program\.php\?catoid=\d+&poid=(\d+)[^"]*)"/g

  const entities: Array<{ pos: number; name: string; ent_oid: string }> = []
  for (const m of html.matchAll(H2_RE)) {
    entities.push({
      pos: m.index ?? 0,
      name: cleanText(m[2]),
      ent_oid: m[1],
    })
  }

  // Each program's school = the h2 heading immediately preceding it in document order.
  const groups: Record<string, string> = {}
  for (const pm of html.matchAll(PROG_RE)) {
    const poid = pm[2]
    const pos = pm.index ?? 0
    let school = ''
    for (const e of entities) {
      if (e.pos > pos) break
      school = e.name
    }
    if (school) groups[poid] = school
  }

  console.log(`[school_groups] found ${entities.length} schools, ${Object.keys(groups).length} poid→school mappings`)
  saveJson('school_groups.json', groups)
  // Seed schools.json with stubs (name + ent_oid). phaseSchools fills in descriptions.
  const stubs: School[] = entities.map((e) => ({ ent_oid: e.ent_oid, name: e.name, description: '' }))
  saveJson('school_stubs.json', stubs)
  return groups
}

// --------------------------------------
// PHASE 3: COURSE DETAILS
// --------------------------------------

const COURSE_LABELS = [
  'Units',
  'Max Units',
  'Terms Offered',
  'Prerequisite',
  'Corequisite',
  'Recommended Preparation',
  'Registration Restriction',
  'Instruction Mode',
  'Grading Option',
  'Crosslisted',
  'Concurrent Enrollment',
  'Duplicates Credit in',
]

function parseCourseDetail(html: string, entry: CourseIndex): CourseDetail {
  const needle = `${entry.dept} ${entry.code}`
  const first = html.indexOf(needle)
  const second = first >= 0 ? html.indexOf(needle, first + 1) : -1
  const start = second >= 0 ? second : first
  if (start < 0) return { ...entry, description: '' }
  const end = html.indexOf('Back to Top', start)
  const raw = html.slice(start, end > 0 ? end : start + 4000)
  const lines = blockToLines(raw)

  const fields: Record<string, string> = {}
  const descChunks: string[] = []
  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Za-z ]{2,40}):\s*(.*)$/)
    if (m && COURSE_LABELS.includes(m[1].trim())) {
      fields[m[1].trim()] = m[2].trim()
    } else if (!line.startsWith(`${entry.dept} ${entry.code}`)) {
      descChunks.push(line)
    }
  }

  return {
    ...entry,
    description: descChunks.join(' ').trim(),
    units: fields['Units'] || fields['Max Units'],
    terms: fields['Terms Offered'],
    prereq: fields['Prerequisite'],
    corequisite: fields['Corequisite'],
    recommended_prep: fields['Recommended Preparation'],
    restriction: fields['Registration Restriction'],
    mode: fields['Instruction Mode'],
    grading: fields['Grading Option'],
    crosslisted: fields['Crosslisted'] || fields['Concurrent Enrollment'],
  }
}

async function phaseDetails(index: CourseIndex[], limit?: number): Promise<CourseDetail[]> {
  const cache = loadJson<CourseDetail[]>('details.json', [])
  const doneCoids = new Set(cache.map((d) => d.coid))
  const todo = index.filter((c) => !doneCoids.has(c.coid)).slice(0, limit)
  console.log(`[details] cached=${cache.length}, todo=${todo.length}`)

  if (todo.length === 0) return cache

  const fresh: CourseDetail[] = []
  const failed: CourseIndex[] = []
  await runPool(
    todo,
    async (entry) => {
      const url = `${BASE}/preview_course_nopop.php?catoid=${CATOID}&coid=${entry.coid}`
      const needle = `${entry.dept} ${entry.code}`
      try {
        const html = await fetchAndValidate(url, needle)
        fresh.push(parseCourseDetail(html, entry))
      } catch (err) {
        failed.push(entry)
      }
    },
    CONCURRENCY,
    (done, total) => {
      console.log(`[details] ${done}/${total} (cumulative ${cache.length + done}/${cache.length + total}) failed=${failed.length}`)
      if (done % 500 === 0) saveJson('details.json', [...cache, ...fresh])
    },
  )

  const all = [...cache, ...fresh]
  saveJson('details.json', all)
  if (failed.length > 0) {
    saveJson('details_failed.json', failed)
    console.warn(`[details] ${failed.length} courses failed after retries. See details_failed.json.`)
  }
  return all
}

// --------------------------------------
// PHASE 4: PROGRAMS (index + detail per program)
// --------------------------------------

const PROGRAM_LABELS = [
  'Admission',
  'Required Courses',
  'Total Units',
  'Units Required',
  'Degree Requirements',
  'Application Requirements',
]

function parseProgramDetail(html: string, p: Program): Program {
  // Program pages are less regular than courses. Grab the h1 content block.
  const nameIdx = html.indexOf(p.name)
  if (nameIdx < 0) return p
  const end = html.indexOf('Back to Top', nameIdx)
  const raw = html.slice(nameIdx, end > 0 ? end : nameIdx + 15000)
  const lines = blockToLines(raw)

  const descChunks: string[] = []
  const requiredCourses: string[] = []
  const COURSE_CODE_RE = /\b([A-Z]{2,5})\s+(\d{3}[A-Za-z]*)\b/g
  for (const line of lines) {
    if (line === p.name) continue
    // Only keep paragraph-length lines as description (skip navigation / labels)
    if (line.length > 30 && !/^(Admission|Required Courses|Total Units|Units Required):/.test(line)) {
      descChunks.push(line)
    }
    for (const m of line.matchAll(COURSE_CODE_RE)) {
      requiredCourses.push(`${m[1]} ${m[2]}`)
    }
  }

  // Derive degree_type from name parentheses: "Accounting (BS)" → "BS"
  const degreeMatch = p.name.match(/\(([A-Za-z./ ]{2,20})\)\s*$/)

  return {
    ...p,
    description: descChunks.join(' ').slice(0, 4000),
    required_courses: [...new Set(requiredCourses)].slice(0, 60) as unknown as undefined, // stored separately below
    degree_type: degreeMatch ? degreeMatch[1].trim() : undefined,
  } as Program & { required_courses?: string[] }
}

async function phasePrograms(schoolGroups: Record<string, string>, limit?: number): Promise<Program[]> {
  // Always walk the index first — it's one cheap fetch and tells us the universe size
  // so we can detect an incomplete cache (prior bug: cache.every(has description) was
  // true for a 5-row smoke-test cache even though 1108 programs were missing).
  const url = `${BASE}/content.php?catoid=${CATOID}&navoid=${PROGRAMS_NAV}`
  console.log(`[programs] fetching index: ${url}`)
  const html = await fetchHtml(url)
  const PROG_RE = /href="(preview_program\.php\?catoid=\d+&poid=(\d+)[^"]*)"[^>]*>\s*([^<]{3,180}?)\s*</g
  const seen = new Set<string>()
  const allPrograms: Program[] = []
  for (const m of html.matchAll(PROG_RE)) {
    const poid = m[2]
    if (seen.has(poid)) continue
    seen.add(poid)
    allPrograms.push({
      poid,
      href: m[1],
      name: cleanText(m[3]),
      description: '',
      school: schoolGroups[poid],
    })
  }
  console.log(`[programs] index found ${allPrograms.length} programs`)

  const cache = loadJson<Program[]>('programs.json', [])
  const donePoids = new Set(cache.filter((p) => p.description && p.description.length >= 30).map((p) => p.poid))
  const todo = allPrograms.filter((p) => !donePoids.has(p.poid))
  const queue = limit ? todo.slice(0, limit) : todo
  console.log(`[programs] cached=${donePoids.size}, todo=${queue.length}`)

  if (queue.length === 0) return cache

  const enriched: Program[] = [...cache.filter((p) => donePoids.has(p.poid))]
  const failed: Program[] = []
  await runPool(
    queue,
    async (p) => {
      const detailUrl = `${BASE}/${p.href}`
      try {
        const detailHtml = await fetchAndValidate(detailUrl, p.name)
        enriched.push(parseProgramDetail(detailHtml, p))
      } catch {
        failed.push(p)
      }
    },
    CONCURRENCY,
    (done, total) => {
      console.log(`[programs-detail] ${done}/${total} failed=${failed.length}`)
    },
  )

  saveJson('programs.json', enriched)
  if (failed.length > 0) {
    saveJson('programs_failed.json', failed)
    console.warn(`[programs] ${failed.length} programs failed after retries.`)
  }
  return enriched
}

// --------------------------------------
// PHASE 5: SCHOOLS — navoid=8862 ("The Schools and Academic Units")
// --------------------------------------

async function phaseSchools(limit?: number): Promise<School[]> {
  // Source: school_stubs.json produced by phaseSchoolGroups. No separate index fetch.
  const stubs = loadJson<School[]>('school_stubs.json', [])
  if (stubs.length === 0) {
    console.error('[schools] no school_stubs.json — run phase=school_groups first')
    return []
  }

  const cache = loadJson<School[]>('schools.json', [])
  const doneEntOids = new Set(cache.filter((s) => s.description && s.description.length >= 100).map((s) => s.ent_oid))
  const todo = stubs.filter((s) => !doneEntOids.has(s.ent_oid))
  const queue = limit ? todo.slice(0, limit) : todo
  console.log(`[schools] stubs=${stubs.length}, cached=${doneEntOids.size}, todo=${queue.length}`)

  if (queue.length === 0) return cache

  const schools: School[] = [...cache.filter((s) => doneEntOids.has(s.ent_oid))]
  await runPool(
    queue,
    async (s) => {
      const url = `${BASE}/preview_entity.php?catoid=${CATOID}&ent_oid=${s.ent_oid}`
      try {
        const html = await fetchAndValidate(url, s.name)
        // First occurrence is inside <title>/<meta>; use second (start of main content block).
        const first = html.indexOf(s.name)
        const second = first >= 0 ? html.indexOf(s.name, first + 1) : -1
        const start = second >= 0 ? second : first
        const end = html.indexOf('Back to Top', start)
        const raw = html.slice(start, end > 0 ? end : start + 15000)
        const lines = blockToLines(raw)
        const desc = lines
          .filter((l) => l !== s.name && l.length > 40 && !/javascript is currently not supported/i.test(l))
          .join(' ')
          .slice(0, 4000)
        if (desc.length > 100) schools.push({ ent_oid: s.ent_oid, name: s.name, description: desc })
      } catch (err) {
        console.warn(`[schools] ${s.name} failed: ${(err as Error).message}`)
      }
    },
    CONCURRENCY,
    (done, total) => console.log(`[schools-detail] ${done}/${total}`),
  )

  console.log(`[schools] parsed ${schools.length} schools with descriptions (was ${doneEntOids.size} cached)`)
  saveJson('schools.json', schools)
  return schools
}

// --------------------------------------
// PHASE 6: INSERT + EMBED
// --------------------------------------

const OPENAI_KEY = process.env.OPENAI_API_KEY

async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY missing')
  let attempt = 0
  while (true) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: inputs }),
    })
    if (res.ok) {
      const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
      return data.data.map((d) => d.embedding)
    }
    // Handle rate-limit + transient 5xx with respect for Retry-After header.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const retryAfter = Number(res.headers.get('retry-after')) || Math.min(60, 2 ** attempt)
      console.warn(`[embed] OpenAI ${res.status} — retrying in ${retryAfter}s (attempt ${attempt + 1})`)
      await sleep(retryAfter * 1000)
      attempt++
      continue
    }
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  }
}

function courseEmbedText(c: CourseDetail): string {
  const parts: string[] = [`${c.dept} ${c.code} — ${c.title}`]
  if (c.description) parts.push(c.description)
  if (c.prereq) parts.push(`Prerequisite: ${c.prereq}`)
  if (c.terms) parts.push(`Terms: ${c.terms}`)
  return parts.join('\n')
}

function programEmbedText(p: Program & { required_courses?: string[] }): string {
  const parts: string[] = [p.name]
  if (p.school) parts.push(`School: ${p.school}`)
  if (p.description) parts.push(p.description)
  return parts.join('\n')
}

function schoolEmbedText(s: School): string {
  return `${s.name}\n${s.description}`
}

async function insertCourses(details: CourseDetail[]) {
  console.log(`[insert] courses: ${details.length} candidates`)

  // Idempotency: skip courses already in DB. We page through the existing coid set
  // (Supabase caps selects at 1k by default) and only embed/upsert the missing ones.
  const existingCoids = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('courses')
      .select('coid')
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) existingCoids.add(r.coid as string)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`[insert] courses already in DB: ${existingCoids.size}`)
  const todo = details.filter((c) => !existingCoids.has(c.coid))
  console.log(`[insert] courses to process: ${todo.length}`)
  if (todo.length === 0) return

  const withDesc = todo.filter((c) => c.description && c.description.length >= 30)
  const withoutDesc = todo.filter((c) => !c.description || c.description.length < 30)

  const embeddingByCoid = new Map<string, number[]>()
  for (let i = 0; i < withDesc.length; i += EMBED_BATCH) {
    const batch = withDesc.slice(i, i + EMBED_BATCH)
    const texts = batch.map(courseEmbedText)
    const embeddings = await embedBatch(texts)
    batch.forEach((c, j) => embeddingByCoid.set(c.coid, embeddings[j]))
    console.log(`[insert] courses embed ${Math.min(i + EMBED_BATCH, withDesc.length)}/${withDesc.length}`)
  }

  const rows = [...withDesc, ...withoutDesc].map((c) => ({
    coid: c.coid,
    dept: c.dept,
    code: c.code,
    title: c.title,
    description: c.description || null,
    units: c.units || null,
    terms: c.terms || null,
    prereq: c.prereq || null,
    corequisite: c.corequisite || null,
    recommended_prep: c.recommended_prep || null,
    restriction: c.restriction || null,
    mode: c.mode || null,
    grading: c.grading || null,
    crosslisted: c.crosslisted || null,
    source_url: `${BASE}/preview_course_nopop.php?catoid=${CATOID}&coid=${c.coid}`,
    embedding: embeddingByCoid.get(c.coid) as unknown as string | undefined,
  }))

  // Upsert in chunks to avoid payload limits.
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('courses')
      .upsert(chunk, { onConflict: 'coid' })
    if (error) {
      console.error(`[insert] courses upsert error at ${i}:`, error.message)
      throw error
    }
    console.log(`[insert] courses upserted ${i + chunk.length}/${rows.length}`)
  }
}

async function insertPrograms(programs: Array<Program & { required_courses?: string[] }>) {
  console.log(`[insert] programs: ${programs.length} candidates`)

  // Same idempotency pattern as courses: skip poids already in DB.
  const existingPoids = new Set<string>()
  const { data: existing, error } = await supabase.from('programs').select('poid')
  if (error) throw error
  for (const r of existing || []) existingPoids.add(r.poid as string)
  console.log(`[insert] programs already in DB: ${existingPoids.size}`)
  const todo = programs.filter((p) => !existingPoids.has(p.poid))
  console.log(`[insert] programs to process: ${todo.length}`)
  if (todo.length === 0) return

  const withDesc = todo.filter((p) => p.description && p.description.length >= 30)
  const embeddingByPoid = new Map<string, number[]>()
  for (let i = 0; i < withDesc.length; i += EMBED_BATCH) {
    const batch = withDesc.slice(i, i + EMBED_BATCH)
    const texts = batch.map(programEmbedText)
    const embeddings = await embedBatch(texts)
    batch.forEach((p, j) => embeddingByPoid.set(p.poid, embeddings[j]))
    console.log(`[insert] programs embed ${Math.min(i + EMBED_BATCH, withDesc.length)}/${withDesc.length}`)
  }

  const rows = todo.map((p) => ({
    poid: p.poid,
    name: p.name,
    degree_type: p.degree_type || null,
    school: p.school || null,
    description: p.description || null,
    required_courses: p.required_courses && p.required_courses.length > 0 ? p.required_courses : null,
    source_url: `${BASE}/${p.href}`,
    embedding: embeddingByPoid.get(p.poid) as unknown as string | undefined,
  }))

  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('programs')
      .upsert(chunk, { onConflict: 'poid' })
    if (error) {
      console.error(`[insert] programs upsert error at ${i}:`, error.message)
      throw error
    }
    console.log(`[insert] programs upserted ${i + chunk.length}/${rows.length}`)
  }
}

async function mirrorProgramsToCampusKnowledge(programs: Program[]) {
  console.log(`[mirror] programs → campus_knowledge`)
  // Skip programs that landed with no description (can't be usefully retrieved).
  const toMirror = programs.filter((p) => p.description && p.description.length >= 50)
  if (toMirror.length === 0) return

  // Idempotency: skip titles already present with category='usc_program'.
  const { data: existing } = await supabase
    .from('campus_knowledge')
    .select('title')
    .eq('category', 'usc_program')
  const existingTitles = new Set((existing || []).map((r) => r.title))
  const todo = toMirror.filter((p) => !existingTitles.has(p.name))
  console.log(`[mirror] programs: existing=${existingTitles.size}, new=${todo.length}`)

  for (let i = 0; i < todo.length; i += EMBED_BATCH) {
    const batch = todo.slice(i, i + EMBED_BATCH)
    const texts = batch.map(programEmbedText)
    const embeddings = await embedBatch(texts)
    const rows = batch.map((p, j) => ({
      title: p.name.slice(0, 240),
      content: programEmbedText(p).slice(0, 4000),
      category: 'usc_program',
      embedding: embeddings[j] as unknown as string,
    }))
    const { error } = await supabase.from('campus_knowledge').insert(rows)
    if (error) {
      console.error(`[mirror] programs insert error at ${i}:`, error.message)
      throw error
    }
    console.log(`[mirror] programs ${i + batch.length}/${todo.length}`)
  }
}

async function mirrorSchoolsToCampusKnowledge(schools: School[]) {
  console.log(`[mirror] schools → campus_knowledge`)
  if (schools.length === 0) return

  const { data: existing } = await supabase
    .from('campus_knowledge')
    .select('title')
    .eq('category', 'usc_school')
  const existingTitles = new Set((existing || []).map((r) => r.title))
  const todo = schools.filter((s) => !existingTitles.has(s.name))
  console.log(`[mirror] schools: existing=${existingTitles.size}, new=${todo.length}`)

  for (let i = 0; i < todo.length; i += EMBED_BATCH) {
    const batch = todo.slice(i, i + EMBED_BATCH)
    const texts = batch.map(schoolEmbedText)
    const embeddings = await embedBatch(texts)
    const rows = batch.map((s, j) => ({
      title: s.name.slice(0, 240),
      content: schoolEmbedText(s).slice(0, 4000),
      category: 'usc_school',
      embedding: embeddings[j] as unknown as string,
    }))
    const { error } = await supabase.from('campus_knowledge').insert(rows)
    if (error) {
      console.error(`[mirror] schools insert error at ${i}:`, error.message)
      throw error
    }
    console.log(`[mirror] schools ${i + batch.length}/${todo.length}`)
  }
}

// --------------------------------------
// MAIN
// --------------------------------------

async function main() {
  ensureDir()
  const args = process.argv.slice(2)
  const phase = args.find((a) => a.startsWith('--phase='))?.split('=')[1] || 'all'
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0) || undefined

  console.log(`[main] phase=${phase} limit=${limit ?? 'none'}`)

  let index: CourseIndex[] = []
  let schoolGroups: Record<string, string> = {}
  let details: CourseDetail[] = []
  let programs: Program[] = []
  let schools: School[] = []

  if (phase === 'all' || phase === 'index') {
    index = await phaseIndex()
  }
  if (phase === 'all' || phase === 'school_groups') {
    schoolGroups = await phaseSchoolGroups()
  }
  if (phase === 'all' || phase === 'details') {
    if (index.length === 0) index = loadJson('index.json', [])
    details = await phaseDetails(index, limit)
  }
  if (phase === 'all' || phase === 'programs') {
    if (Object.keys(schoolGroups).length === 0) schoolGroups = loadJson('school_groups.json', {})
    programs = await phasePrograms(schoolGroups, limit)
  }
  if (phase === 'all' || phase === 'schools') {
    schools = await phaseSchools(limit)
  }
  if (phase === 'all' || phase === 'insert') {
    if (details.length === 0) details = loadJson('details.json', [])
    if (programs.length === 0) programs = loadJson('programs.json', [])
    if (schools.length === 0) schools = loadJson('schools.json', [])
    if (details.length > 0) await insertCourses(details)
    if (programs.length > 0) await insertPrograms(programs as Array<Program & { required_courses?: string[] }>)
    if (programs.length > 0) await mirrorProgramsToCampusKnowledge(programs)
    if (schools.length > 0) await mirrorSchoolsToCampusKnowledge(schools)
  }

  console.log('[main] done')
  process.exit(0)
}

main().catch((err) => {
  console.error('[main] fatal:', err)
  process.exit(1)
})
