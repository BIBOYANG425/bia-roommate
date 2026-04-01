/**
 * 3-Layer Course Recommendation Agent (Paid / LLM mode)
 *
 * Layer 1: Interpreter — LLM parses natural language → dispatches instructions to research agents
 * Layer 2: Research Agents — Execute interpreter's instructions across USC catalog, RMP, Reddit
 * Layer 3: Recommender — LLM synthesizes all research into ranked recommendations
 *
 * Harness constraint: USC-only, course-related only. Rejects all other requests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───

interface InterpretedQuery {
  isValid: boolean
  rejection?: string

  // Instructions for each research agent (natural language from the interpreter)
  catalogInstructions: {
    departments: string[]
    geCategories: string[]        // e.g. ["GE-C"] — specific categories, not just boolean
    courseLevel: string            // e.g. "100-200 level only" or "any"
    unitsPreference: string       // e.g. "2 units" or "any"
    searchTerms: string[]         // keywords to search titles/descriptions
    filterNotes: string           // e.g. "only courses with active sections"
  }
  rmpInstructions: {
    prioritize: string            // e.g. "low difficulty professors" or "highest rated"
    difficultyTarget: string      // e.g. "below 3.0" or "any"
    minimumRating: string         // e.g. "above 3.5" or "any"
    lookFor: string               // e.g. "professors students say are fun and engaging"
  }
  redditInstructions: {
    searchQueries: string[]       // e.g. ["easy GE-C USC", "no midterm USC class"]
    lookFor: string               // e.g. "posts about easy classes, no midterms, fun professors"
    avoid: string                 // e.g. "ignore posts about hard or demanding courses"
  }

  // Structured data for the recommender
  studentProfile: {
    interests: string[]
    preferences: string[]         // e.g. ["fun", "easy", "no midterms", "chill professor"]
    dealbreakers: string[]        // e.g. ["no midterms", "no 8am classes"]
  }
}

interface ResearchedCourse {
  department: string
  number: string
  title: string
  units: string
  description: string
  instructors: { name: string; rating?: number; difficulty?: number; numRatings?: number; wouldTakeAgain?: number }[]
  communityInsights: string[]
  geTag?: string
}

export interface AgentRecommendation {
  department: string
  number: string
  title: string
  units: string
  description: string
  relevanceScore: number
  matchReasons: string[]
  geTag?: string
  topInstructor?: { name: string; rating: number }
  communityHighlights: string[]
  aiReasoning: string
}

// ─── LLM Provider Config ───

type LLMProvider = 'anthropic' | 'openai' | 'nvidia'
type LLMConfig = { provider: LLMProvider; apiKey: string; baseUrl: string; model: string }

// Fast model for interpreter (structured JSON parsing)
function getInterpreterConfig(): LLMConfig | null {
  // Prefer fast NVIDIA model for interpreter
  if (process.env.NVIDIA_FAST_KEY) {
    return {
      provider: 'nvidia',
      apiKey: process.env.NVIDIA_FAST_KEY,
      baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
      model: process.env.NVIDIA_FAST_MODEL || 'google/gemma-3n-e4b-it',
    }
  }
  return getLLMConfig()
}

// Main model for recommender (reasoning + synthesis)
function getLLMConfig(): LLMConfig | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-haiku-4-5-20251001',
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
    }
  }
  if (process.env.NVIDIA_API_KEY) {
    return {
      provider: 'nvidia',
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
      model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
    }
  }
  return null
}

interface LLMResult {
  content: string
  reasoning?: string
}

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  config: { provider: LLMProvider; apiKey: string; baseUrl: string; model: string },
  maxTokens: number = 500,
  timeoutMs: number = 15000,
  thinking: boolean = false
): Promise<LLMResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  let body: any

  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey
    headers['anthropic-version'] = '2023-06-01'
    body = {
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }
  } else {
    headers['Authorization'] = `Bearer ${config.apiKey}`
    body = {
      model: config.model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }
    // NVIDIA reasoning mode control — top-level param (not nested in extra_body)
    if (config.provider === 'nvidia') {
      body.chat_template_kwargs = { enable_thinking: thinking }
      if (thinking) {
        // Reasoning models need more tokens — budget for thinking + output
        body.max_tokens = maxTokens * 3
      }
    }
  }

  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()

  if (config.provider === 'anthropic') {
    return { content: data.content?.[0]?.text || '' }
  }
  const msg = data.choices?.[0]?.message
  return {
    content: msg?.content || msg?.reasoning_content || '',
    reasoning: msg?.reasoning_content || undefined,
  }
}

// ─── Layer 1: Interpreter ───

const SYSTEM_PROMPT_INTERPRETER = `You are a USC course search dispatcher. Your job is to understand what a student is looking for and write specific instructions for 3 research agents that will find courses for them.

HARD CONSTRAINTS:
- You can ONLY help with USC course-related queries
- If the request is NOT about finding/choosing USC courses, set isValid to false
- INVALID examples: "write my essay", "what's the weather", "help me study"
- VALID examples: "fun easy GE class", "I like AI and sports", "2 unit chill class no midterms", "something related to film and media"

You are dispatching 3 agents:
1. CATALOG AGENT — searches the USC course catalog by department, GE category, level, units
2. RMP AGENT — looks up professor ratings on RateMyProfessors (rating, difficulty, would-take-again)
3. REDDIT AGENT — searches r/USC for student discussions, reviews, and opinions

Your job is to figure out what the student ACTUALLY wants and tell each agent exactly what to search for.

EXAMPLES:

Input: "I want a fun class related to sports media, 2 units"
→ catalogInstructions.departments: ["COMM", "JOUR", "EXSC"]
→ catalogInstructions.searchTerms: ["sport", "media", "athletic", "broadcast"]
→ catalogInstructions.unitsPreference: "2"
→ rmpInstructions.prioritize: "highest rated professors — student wants fun"
→ rmpInstructions.lookFor: "professors described as engaging, fun, entertaining"
→ redditInstructions.searchQueries: ["USC sports media class", "fun 2 unit USC", "COMM sports USC"]
→ studentProfile.preferences: ["fun", "engaging", "sports-related"]

Input: "easy GE-C class without midterms"
→ catalogInstructions.departments: [] (GE category is enough)
→ catalogInstructions.geCategories: ["GE-C"]
→ catalogInstructions.courseLevel: "100-200 level preferred"
→ rmpInstructions.prioritize: "lowest difficulty professors"
→ rmpInstructions.difficultyTarget: "below 2.5"
→ redditInstructions.searchQueries: ["easy GE-C USC", "GE-C no midterm", "easiest GE C USC reddit"]
→ redditInstructions.lookFor: "posts about easy GE-C classes, no midterms, light workload"
→ studentProfile.preferences: ["easy", "light workload"]
→ studentProfile.dealbreakers: ["no midterms"]

Input: "I'm interested in AI and machine learning"
→ catalogInstructions.departments: ["CSCI", "EE", "DSCI", "PHIL"]
→ catalogInstructions.searchTerms: ["artificial intelligence", "machine learning", "deep learning", "neural network"]
→ rmpInstructions.prioritize: "highest rated professors in CS/EE"
→ rmpInstructions.minimumRating: "above 3.5"
→ redditInstructions.searchQueries: ["USC AI class", "machine learning USC", "CSCI AI course"]
→ studentProfile.interests: ["artificial intelligence", "machine learning"]

USC GE categories:
- GE-A: The Arts
- GE-B: Humanistic Inquiry
- GE-C: Social Analysis
- GE-D: Life Sciences
- GE-E: Physical Sciences
- GE-F: Quantitative Reasoning
- GE-G: Global Perspectives I
- GE-H: Global Perspectives II

USC department codes:
- CS/Tech: CSCI, ITP, DSCI, INF, CTIN, EE
- Engineering: ME, AME, BME, CHE, CE, ISE, ASTE, ENGR
- Business: BUAD, BAEP, ACCT, FBE, MOR, ECON
- Film/Media: CTCS, CTAN, CTWR, COMM, JOUR
- Arts: ARTS, DSGN, ARCH, FACS, AHIS
- Music: MUSC, MUCO, MUPF, MUIN, MUHL
- Theater: THTR, DRMA, DANC
- Sciences: BISC, CHEM, PHYS, MATH, ASTR, NEUR, GEOL
- Social Sciences: PSYC, SOCI, POSC, IR, ANTH, GEOG, PPD, SWMS, AMST
- Humanities: ENGL, HIST, PHIL, REL, CLAS, WRIT, LING, COLT, ARLT
- Languages: EALC, EASC, SPAN, FREN, GERM, JAPN, CHIN, KORE
- Health: HPRE, HP, PHBI, GERO, EXSC
- Education: EDUC, EDHP

Respond with ONLY valid JSON:
{
  "isValid": true,
  "catalogInstructions": {
    "departments": [],
    "geCategories": [],
    "courseLevel": "any",
    "unitsPreference": "any",
    "searchTerms": [],
    "filterNotes": ""
  },
  "rmpInstructions": {
    "prioritize": "",
    "difficultyTarget": "any",
    "minimumRating": "any",
    "lookFor": ""
  },
  "redditInstructions": {
    "searchQueries": [],
    "lookFor": "",
    "avoid": ""
  },
  "studentProfile": {
    "interests": [],
    "preferences": [],
    "dealbreakers": []
  }
}`

async function interpret(
  interestText: string,
  config: LLMConfig,
  thinking: boolean = false
): Promise<{ query: InterpretedQuery; reasoning?: string }> {
  const interpreterConfig = getInterpreterConfig() || config
  const result = await callLLM(
    SYSTEM_PROMPT_INTERPRETER,
    `Student says: "${interestText}"`,
    interpreterConfig,
    1500,
    30000,
    false // interpreter always fast mode — no thinking needed for JSON parsing
  )

  const jsonMatch = result.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse interpreter response')
  }

  return {
    query: JSON.parse(jsonMatch[0]) as InterpretedQuery,
    reasoning: result.reasoning,
  }
}

// ─── Layer 2: Research Agents ───

const GE_API_MAP: Record<string, { req: string; cat: string }> = {
  'GE-A': { req: 'ACORELIT', cat: 'ARTS' },
  'GE-B': { req: 'ACORELIT', cat: 'HINQ' },
  'GE-C': { req: 'ACORELIT', cat: 'SANA' },
  'GE-D': { req: 'ACORELIT', cat: 'LIFE' },
  'GE-E': { req: 'ACORELIT', cat: 'PSC' },
  'GE-F': { req: 'ACORELIT', cat: 'QREA' },
  'GE-G': { req: 'AGLOPERS', cat: 'GPG' },
  'GE-H': { req: 'AGLOPERS', cat: 'GPH' },
}

// Agent 2a: USC Course Catalog — follows catalogInstructions
async function researchUSCCatalog(
  instructions: InterpretedQuery['catalogInstructions'],
  semester: string,
  baseUrl: string
): Promise<ResearchedCourse[]> {
  const courses: ResearchedCourse[] = []
  const seen = new Set<string>()

  // Parse units preference
  const wantedUnits = instructions.unitsPreference !== 'any'
    ? instructions.unitsPreference.replace(/[^0-9.]/g, '')
    : null

  // Parse level preference
  const levelStr = instructions.courseLevel.toLowerCase()
  const maxLevel = levelStr.includes('100') || levelStr.includes('intro') ? 200
    : levelStr.includes('200') ? 300
    : levelStr.includes('300') || levelStr.includes('intermediate') ? 400
    : 999

  function shouldInclude(num: string, units: string): boolean {
    const numVal = parseInt(num, 10)
    if (maxLevel < 999 && numVal >= maxLevel) return false
    if (wantedUnits && units && units !== wantedUnits) return false
    return true
  }

  function addCourse(c: any, geTag?: string) {
    const dept = c.scheduledCourseCode?.prefix || c.department || ''
    const num = (c.scheduledCourseCode?.number || c.number || '') + (c.scheduledCourseCode?.suffix || '')
    const key = `${dept}-${num}`
    const units = c.courseUnits?.[0]?.toString() || c.units || ''

    if (seen.has(key)) {
      if (geTag) {
        const existing = courses.find((x) => `${x.department}-${x.number}` === key)
        if (existing && !existing.geTag) existing.geTag = geTag
      }
      return
    }

    if (!shouldInclude(num, units)) return

    seen.add(key)

    const sections = c.sections || []
    const instructors = sections
      .filter((s: any) => s.instructors?.[0]?.lastName)
      .map((s: any) => ({
        name: `${s.instructors[0].firstName} ${s.instructors[0].lastName}`,
      }))
      .filter((inst: any, i: number, arr: any[]) =>
        arr.findIndex((a: any) => a.name === inst.name) === i
      )

    courses.push({
      department: dept,
      number: num,
      title: c.name || c.fullCourseName || c.title || '',
      units,
      description: c.description || '',
      instructors,
      communityInsights: [],
      geTag,
    })
  }

  // 1. Fetch by department
  const deptFetches = instructions.departments.slice(0, 8).map(async (dept) => {
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/CoursesForDepartment?termCode=${semester}&prefix=${dept}`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return []
      const data = await res.json()
      return (data.courses || data || []) as any[]
    } catch {
      return []
    }
  })

  // 2. Search by terms
  const termFetches = instructions.searchTerms.slice(0, 5).map(async (term) => {
    try {
      const res = await fetch(
        `${baseUrl}/api/courses/search?q=${encodeURIComponent(term)}&semester=${semester}`
      )
      if (!res.ok) return []
      return await res.json() as any[]
    } catch {
      return []
    }
  })

  // 3. Fetch specific GE categories
  const geFetches = instructions.geCategories.map(async (geCode) => {
    const mapping = GE_API_MAP[geCode]
    if (!mapping) return []
    try {
      const res = await fetch(
        `https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode=${semester}&geRequirementPrefix=${mapping.req}&categoryPrefix=${mapping.cat}`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return []
      const data = await res.json()
      return (data.courses || []).map((c: any) => ({ ...c, _geTag: geCode }))
    } catch {
      return []
    }
  })

  const [deptResults, termResults, geResults] = await Promise.all([
    Promise.all(deptFetches),
    Promise.all(termFetches),
    Promise.all(geFetches),
  ])

  for (const deptCourses of deptResults) {
    for (const c of deptCourses) addCourse(c)
  }
  for (const results of termResults) {
    for (const c of results) addCourse(c)
  }
  for (const geCourses of geResults) {
    for (const c of geCourses) addCourse(c, c._geTag)
  }

  return courses
}

// Agent 2b: RateMyProfessors — follows rmpInstructions
async function researchRMP(
  courses: ResearchedCourse[],
  instructions: InterpretedQuery['rmpInstructions'],
  baseUrl: string
): Promise<void> {
  const allInstructors = new Set<string>()
  for (const c of courses) {
    for (const inst of c.instructors) {
      allInstructors.add(inst.name)
    }
  }

  const names = [...allInstructors].slice(0, 50)
  if (names.length === 0) return

  try {
    const res = await fetch(
      `${baseUrl}/api/rmp/batch?names=${encodeURIComponent(names.join(','))}`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) return
    const data = await res.json()
    const ratings = data.ratings || {}

    for (const c of courses) {
      for (const inst of c.instructors) {
        const rating = ratings[inst.name]
        if (rating) {
          inst.rating = rating.avgRating
          inst.difficulty = rating.avgDifficulty
          inst.numRatings = rating.numRatings
          inst.wouldTakeAgain = rating.wouldTakeAgainPercent
        }
      }
    }
  } catch {
    // RMP data is optional
  }

  // Apply RMP-based filtering hints from interpreter
  // Parse difficulty target
  const diffMatch = instructions.difficultyTarget.match(/([\d.]+)/)
  const maxDifficulty = diffMatch ? parseFloat(diffMatch[1]) : null

  const ratingMatch = instructions.minimumRating.match(/([\d.]+)/)
  const minRating = ratingMatch ? parseFloat(ratingMatch[1]) : null

  // Tag courses with RMP fitness score based on interpreter's instructions
  for (const c of courses) {
    let rmpFit = 0
    for (const inst of c.instructors) {
      if (!inst.rating) continue
      let fit = inst.rating // base: higher rating = better
      if (maxDifficulty && inst.difficulty && inst.difficulty <= maxDifficulty) fit += 1.0
      if (minRating && inst.rating >= minRating) fit += 0.5
      if (inst.wouldTakeAgain && inst.wouldTakeAgain > 70) fit += 0.5
      rmpFit = Math.max(rmpFit, fit)
    }
    // Store as a community insight so the recommender can see it
    if (rmpFit > 0) {
      const bestProf = c.instructors
        .filter((i) => i.rating)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      if (bestProf) {
        const diffStr = bestProf.difficulty ? `, difficulty ${bestProf.difficulty}/5` : ''
        const wtaStr = bestProf.wouldTakeAgain && bestProf.wouldTakeAgain > 0
          ? `, ${bestProf.wouldTakeAgain}% would take again`
          : ''
        c.communityInsights.unshift(
          `Best prof: ${bestProf.name} — ${bestProf.rating}/5 RMP${diffStr}${wtaStr}`
        )
      }
    }
  }
}

// Agent 2c: Reddit — follows redditInstructions
async function researchReddit(
  courses: ResearchedCourse[],
  instructions: InterpretedQuery['redditInstructions']
): Promise<void> {
  const queries = instructions.searchQueries.slice(0, 6)
  if (queries.length === 0) return

  const searches = queries.map(async (term) => {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/USC/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&sort=relevance&limit=8`,
        {
          headers: { 'User-Agent': 'BIA-CourseAdvisor/1.0' },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!res.ok) return []
      const data = await res.json()
      const posts = data?.data?.children || []
      return posts.map((p: any) => ({
        title: p.data?.title || '',
        selftext: (p.data?.selftext || '').slice(0, 500),
        score: p.data?.score || 0,
        numComments: p.data?.num_comments || 0,
      }))
    } catch {
      return []
    }
  })

  const results = await Promise.all(searches)

  // Match insights to courses by course code
  for (const posts of results) {
    for (const post of posts) {
      if (post.score < 1) continue
      const text = `${post.title} ${post.selftext}`.toUpperCase()

      for (const c of courses) {
        const courseCode = `${c.department} ${c.number}`.toUpperCase()
        const courseCodeSmashed = `${c.department}${c.number}`.toUpperCase()
        if (text.includes(courseCode) || text.includes(courseCodeSmashed)) {
          const insight = post.title.slice(0, 150)
          if (c.communityInsights.length < 4 && !c.communityInsights.includes(insight)) {
            c.communityInsights.push(insight)
          }
        }
      }
    }
  }

  // Also collect general insights (not course-specific) that match the lookFor criteria
  const generalInsights: string[] = []
  const lookForUpper = instructions.lookFor.toUpperCase()
  const lookForWords = lookForUpper.split(/\s+/).filter((w) => w.length > 3)

  for (const posts of results) {
    for (const post of posts) {
      if (post.score < 3) continue
      const titleUpper = post.title.toUpperCase()
      if (lookForWords.some((w) => titleUpper.includes(w))) {
        generalInsights.push(post.title.slice(0, 150))
      }
    }
  }

  // Attach general insights to top courses that have no specific insights
  for (const c of courses) {
    if (c.communityInsights.length === 0 && generalInsights.length > 0) {
      c.communityInsights.push(generalInsights[0])
    }
  }
}

// ─── Layer 3: Recommender ───

const SYSTEM_PROMPT_RECOMMENDER = `You are a USC course recommendation engine. A student described what they want, an interpreter analyzed their request, and research agents gathered data. Now you rank the best courses.

You receive:
1. What the student said (raw input)
2. What the interpreter understood (interests, preferences, dealbreakers)
3. Research data (courses with descriptions, professor ratings, Reddit discussions)

RANKING RULES:
- Match the student's actual intent, not just keywords. "Fun" means engaging professor + interesting content. "Easy" means low difficulty + light workload.
- Dealbreakers are hard filters. If a student says "no midterms" and a Reddit post says the class has midterms, rank it lower.
- Professor quality matters. A great course with a bad professor is worse than a good course with a great professor.
- RMP difficulty below 2.5 = easy. Above 3.5 = hard. Consider this when student asks for "easy".
- "Would take again" percentage above 80% is a strong signal.
- GE fulfillment is a bonus for freshmen.
- Prefer courses with community evidence (Reddit mentions, high RMP review count) over unknowns.
- When student asks for specific units (e.g. "2 units"), only recommend courses with those units.

HARD CONSTRAINTS:
- Only recommend courses from the provided research data
- Do not invent courses
- Max 15 courses
- relevanceScore is 0-10

Respond with ONLY a JSON array:
[{
  "department": "COMM",
  "number": "150",
  "relevanceScore": 9.2,
  "matchReasons": ["Sports media focus", "Professor rated 4.5/5", "Students say it's fun and easy"],
  "communityHighlights": ["Reddit: 'Best 2-unit class I took at USC'"],
  "aiReasoning": "This course directly covers sports media with an engaging professor rated 4.5 on RMP. Multiple Reddit posts call it fun and light workload."
}]`

async function recommend(
  interestText: string,
  query: InterpretedQuery,
  courses: ResearchedCourse[],
  config: LLMConfig,
  thinking: boolean = false
): Promise<{ recommendations: AgentRecommendation[]; reasoning?: string }> {
  // Build research summary — keep compact for faster LLM processing
  const courseSummaries = courses.slice(0, 40).map((c) => {
    const parts = [`${c.department} ${c.number}: ${c.title} (${c.units} units)`]
    if (c.description) parts.push(`  Desc: ${c.description.slice(0, 120)}`)
    if (c.geTag) parts.push(`  GE: ${c.geTag}`)
    for (const inst of c.instructors.slice(0, 2)) {
      const rmpParts: string[] = []
      if (inst.rating) rmpParts.push(`${inst.rating}/5`)
      if (inst.difficulty) rmpParts.push(`diff ${inst.difficulty}/5`)
      if (inst.wouldTakeAgain && inst.wouldTakeAgain > 0) rmpParts.push(`${inst.wouldTakeAgain}% again`)
      const rmpStr = rmpParts.length > 0 ? ` (${rmpParts.join(', ')})` : ''
      parts.push(`  Prof: ${inst.name}${rmpStr}`)
    }
    for (const insight of c.communityInsights.slice(0, 2)) {
      parts.push(`  Reddit: "${insight.slice(0, 100)}"`)
    }
    return parts.join('\n')
  })

  const profile = query.studentProfile
  const userMessage = `STUDENT INPUT: "${interestText}"

INTERPRETER ANALYSIS:
- Interests: ${profile.interests.join(', ') || 'general'}
- Preferences: ${profile.preferences.join(', ') || 'none specified'}
- Dealbreakers: ${profile.dealbreakers.join(', ') || 'none'}
- RMP focus: ${query.rmpInstructions.prioritize}
- Wanted units: ${query.catalogInstructions.unitsPreference}
- Wanted GE: ${query.catalogInstructions.geCategories.join(', ') || 'none'}
- Wanted level: ${query.catalogInstructions.courseLevel}

RESEARCH DATA (${courseSummaries.length} courses found):

${courseSummaries.join('\n\n')}`

  const result = await callLLM(SYSTEM_PROMPT_RECOMMENDER, userMessage, config, 4000, 120000, thinking)

  const jsonMatch = result.content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to parse recommender response')
  }

  const ranked = JSON.parse(jsonMatch[0]) as any[]

  const recommendations = ranked.slice(0, 15).map((rec: any) => {
    const courseData = courses.find(
      (c) => c.department === rec.department && c.number === rec.number
    )

    const topInstructor = courseData?.instructors
      .filter((i) => i.rating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]

    return {
      department: rec.department,
      number: rec.number,
      title: courseData?.title || '',
      units: courseData?.units || '',
      description: courseData?.description || '',
      relevanceScore: rec.relevanceScore || 0,
      matchReasons: rec.matchReasons || [],
      geTag: courseData?.geTag,
      topInstructor: topInstructor?.rating
        ? { name: topInstructor.name, rating: topInstructor.rating }
        : undefined,
      communityHighlights: rec.communityHighlights || courseData?.communityInsights || [],
      aiReasoning: rec.aiReasoning || '',
    }
  })

  return { recommendations, reasoning: result.reasoning }
}

// ─── Orchestrator ───

export async function runAgent(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter?: string
): Promise<{ recommendations: AgentRecommendation[]; mode: 'agent' } | { error: string; isRejection?: boolean }> {
  const config = getLLMConfig()
  if (!config) {
    return { error: 'No LLM API key configured' }
  }

  // Layer 1: Interpreter dispatches instructions
  const { query } = await interpret(interestText, config)

  if (!query.isValid) {
    return {
      error: query.rejection || 'I can only help with USC course-related questions.',
      isRejection: true,
    }
  }

  // Layer 2: Research agents execute instructions in parallel
  const catalogCourses = await researchUSCCatalog(query.catalogInstructions, semester, baseUrl)

  if (catalogCourses.length === 0) {
    return { error: 'No courses found matching your criteria.' }
  }

  await Promise.all([
    researchRMP(catalogCourses, query.rmpInstructions, baseUrl),
    researchReddit(catalogCourses, query.redditInstructions),
  ])

  // Layer 3: Recommender synthesizes everything
  const { recommendations: recs } = await recommend(interestText, query, catalogCourses, config)

  let recommendations = recs
  if (unitsFilter) {
    recommendations = recommendations.filter((r) => {
      const courseData = catalogCourses.find(
        (c) => c.department === r.department && c.number === r.number
      )
      return courseData?.units === unitsFilter
    })
  }

  return { recommendations, mode: 'agent' }
}

// ─── Streaming Orchestrator (emits events as agent works) ───

export type AgentEvent =
  | { type: 'thinking'; message: string }
  | { type: 'reasoning'; step: 'interpreter' | 'recommender'; content: string }
  | { type: 'interpreted'; data: { interests: string[]; preferences: string[]; dealbreakers: string[]; departments: string[]; geCategories: string[] } }
  | { type: 'researching'; source: 'catalog' | 'rmp' | 'reddit'; message: string }
  | { type: 'research_done'; source: 'catalog' | 'rmp' | 'reddit'; message: string }
  | { type: 'recommending'; message: string }
  | { type: 'results'; data: AgentRecommendation[] }
  | { type: 'error'; message: string; isRejection?: boolean }

export async function runAgentStreaming(
  interestText: string,
  semester: string,
  baseUrl: string,
  unitsFilter: string | undefined,
  thinking: boolean,
  emit: (event: AgentEvent) => void
): Promise<void> {
  const config = getLLMConfig()
  if (!config) {
    emit({ type: 'error', message: 'No LLM API key configured' })
    return
  }

  // Layer 1: Interpreter (always uses fast model)
  emit({ type: 'thinking', message: `Understanding your request: "${interestText}"` })

  let query: InterpretedQuery
  try {
    const interpreted = await interpret(interestText, config, thinking)
    query = interpreted.query
    if (interpreted.reasoning) {
      emit({ type: 'reasoning', step: 'interpreter', content: interpreted.reasoning })
    }
  } catch (err) {
    emit({ type: 'error', message: `Failed to interpret request: ${(err as Error).message}` })
    return
  }

  if (!query.isValid) {
    emit({ type: 'error', message: query.rejection || 'I can only help with USC course-related questions.', isRejection: true })
    return
  }

  const profile = query.studentProfile
  emit({
    type: 'interpreted',
    data: {
      interests: profile.interests,
      preferences: profile.preferences,
      dealbreakers: profile.dealbreakers,
      departments: query.catalogInstructions.departments,
      geCategories: query.catalogInstructions.geCategories,
    },
  })

  // Layer 2a: Catalog
  const deptStr = query.catalogInstructions.departments.slice(0, 5).join(', ') || 'all'
  const geStr = query.catalogInstructions.geCategories.length > 0
    ? ` + ${query.catalogInstructions.geCategories.join(', ')}`
    : ''
  emit({ type: 'researching', source: 'catalog', message: `Searching USC catalog: ${deptStr}${geStr} departments...` })

  let catalogCourses: ResearchedCourse[]
  try {
    catalogCourses = await researchUSCCatalog(query.catalogInstructions, semester, baseUrl)
  } catch (err) {
    emit({ type: 'error', message: `Catalog search failed: ${(err as Error).message}` })
    return
  }

  if (catalogCourses.length === 0) {
    emit({ type: 'error', message: 'No courses found matching your criteria. Try broader interests.' })
    return
  }

  emit({ type: 'research_done', source: 'catalog', message: `Found ${catalogCourses.length} candidate courses` })

  // Layer 2b+c: RMP + Reddit in parallel
  emit({ type: 'researching', source: 'rmp', message: `Checking professor ratings for ${Math.min(catalogCourses.reduce((n, c) => n + c.instructors.length, 0), 50)} instructors...` })
  emit({ type: 'researching', source: 'reddit', message: `Searching r/USC for student discussions: ${query.redditInstructions.searchQueries.slice(0, 3).map(q => `"${q}"`).join(', ')}...` })

  await Promise.all([
    researchRMP(catalogCourses, query.rmpInstructions, baseUrl).then(() => {
      const withRating = catalogCourses.filter((c) => c.instructors.some((i) => i.rating))
      emit({ type: 'research_done', source: 'rmp', message: `${withRating.length} courses have rated professors` })
    }),
    researchReddit(catalogCourses, query.redditInstructions).then(() => {
      const withInsights = catalogCourses.filter((c) => c.communityInsights.length > 0)
      emit({ type: 'research_done', source: 'reddit', message: `${withInsights.length} courses have student discussions` })
    }),
  ])

  // Layer 3: Recommender (uses main model, with optional thinking)
  emit({ type: 'recommending', message: thinking
    ? 'Deep-thinking mode: carefully analyzing courses against your preferences...'
    : 'Ranking courses based on your preferences, professor quality, and community feedback...'
  })

  let recommendations: AgentRecommendation[]
  try {
    const recResult = await recommend(interestText, query, catalogCourses, config, thinking)
    recommendations = recResult.recommendations
    if (recResult.reasoning) {
      emit({ type: 'reasoning', step: 'recommender', content: recResult.reasoning })
    }
  } catch (err) {
    emit({ type: 'error', message: `Recommendation failed: ${(err as Error).message}` })
    return
  }

  // Hard filter by units
  if (unitsFilter) {
    recommendations = recommendations.filter((r) => {
      const courseData = catalogCourses.find(
        (c) => c.department === r.department && c.number === r.number
      )
      return courseData?.units === unitsFilter
    })
  }

  emit({ type: 'results', data: recommendations })
}
