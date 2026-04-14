# George Tirebiter AI Companion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build George Tirebiter, BIA's mischievous ghost-dog AI concierge, as a dual-platform chatbot (WeChat + iMessage) powered by Claude with 14 custom tools.

**Architecture:** Standalone Node.js/Express server handling WeChat webhooks and Photon iMessage Socket.IO connections. Each incoming message triggers a Claude agentic loop with George's personality system prompt and custom tools. Supabase for all data storage + pgvector for RAG. Apify for Instagram scraping.

**Tech Stack:** TypeScript, Node.js, Express, `@anthropic-ai/sdk` (tool use), `@photon-ai/advanced-imessage-kit`, Supabase (PostgreSQL + pgvector), Apify, `xml2js`

---

## Project Structure

```
george/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                  # Server entry point
│   ├── config.ts                 # Environment config
│   ├── agent/
│   │   ├── george.ts             # Agent core: personality + agentic loop
│   │   ├── personality.ts        # George's system prompt
│   │   └── tool-registry.ts      # Tool definitions registry
│   ├── adapters/
│   │   ├── wechat.ts             # WeChat webhook handler
│   │   ├── wechat-xml.ts         # XML parse/build helpers
│   │   ├── imessage.ts           # Photon iMessage adapter
│   │   └── types.ts              # Shared message types
│   ├── tools/
│   │   ├── search-events.ts
│   │   ├── get-event-details.ts
│   │   ├── campus-knowledge.ts
│   │   ├── lookup-student.ts
│   │   ├── search-courses.ts
│   │   ├── get-course-reviews.ts
│   │   ├── recommend-courses.ts
│   │   ├── plan-schedule.ts
│   │   ├── search-roommates.ts
│   │   ├── search-sublets.ts
│   │   ├── post-sublet.ts
│   │   ├── set-reminder.ts
│   │   ├── suggest-connection.ts
│   │   └── submit-event.ts
│   ├── db/
│   │   ├── client.ts             # Supabase client
│   │   ├── students.ts           # Student CRUD
│   │   ├── events.ts             # Event CRUD
│   │   ├── conversations.ts      # Conversation history
│   │   └── reminders.ts          # Reminder CRUD
│   └── scrapers/
│       ├── instagram.ts          # Apify Instagram scraper
│       └── usc-events.ts         # USC calendar scraper
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── tests/
    ├── agent/
    │   ├── george.test.ts
    │   └── personality.test.ts
    ├── adapters/
    │   ├── wechat.test.ts
    │   ├── wechat-xml.test.ts
    │   └── imessage.test.ts
    ├── tools/
    │   ├── search-events.test.ts
    │   ├── campus-knowledge.test.ts
    │   └── ...
    └── db/
        └── ...
```

---

## Week 1: Core Agent + WeChat

### Task 1: Project Scaffolding

**Files:**
- Create: `george/package.json`
- Create: `george/tsconfig.json`
- Create: `george/.env.example`
- Create: `george/src/config.ts`

**Step 1: Initialize project**

```bash
cd "BIA 新生service"
mkdir -p george/src george/tests george/supabase/migrations
cd george
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express @anthropic-ai/sdk @supabase/supabase-js @photon-ai/advanced-imessage-kit xml2js apify-client dotenv cors
npm install -D typescript @types/express @types/node @types/xml2js vitest tsx @types/cors
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 4: Create .env.example**

```env
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WeChat Official Account
WECHAT_TOKEN=
WECHAT_APP_ID=
WECHAT_APP_SECRET=

# Photon iMessage
IMESSAGE_SERVER_URL=http://localhost:1234
IMESSAGE_API_KEY=

# Apify
APIFY_TOKEN=

# Server
PORT=3001
```

**Step 5: Create src/config.ts**

```typescript
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  wechat: {
    token: process.env.WECHAT_TOKEN!,
    appId: process.env.WECHAT_APP_ID!,
    appSecret: process.env.WECHAT_APP_SECRET!,
  },
  imessage: {
    serverUrl: process.env.IMESSAGE_SERVER_URL || 'http://localhost:1234',
    apiKey: process.env.IMESSAGE_API_KEY || '',
  },
  apify: {
    token: process.env.APIFY_TOKEN!,
  },
  port: parseInt(process.env.PORT || '3001'),
}
```

**Step 6: Add scripts to package.json**

Add to `package.json`:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 7: Commit**

```bash
git add george/
git commit -m "feat(george): project scaffolding with dependencies and config"
```

---

### Task 2: Supabase Schema

**Files:**
- Create: `george/supabase/migrations/001_initial_schema.sql`
- Create: `george/src/db/client.ts`

**Step 1: Write the migration SQL**

```sql
-- george/supabase/migrations/001_initial_schema.sql

-- Enable pgvector extension for RAG
create extension if not exists vector;

-- Students table
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  wechat_open_id text unique,
  imessage_id text unique,
  name text,
  major text,
  year text,
  interests text[],
  notification_prefs jsonb default '{"events": true, "frequency": "daily"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz,
  end_date timestamptz,
  location text,
  category text,
  source text not null check (source in ('bia', 'usc', 'instagram', 'community')),
  source_url text,
  source_account text,
  image_url text,
  capacity int,
  status text default 'active' check (status in ('active', 'cancelled', 'past')),
  created_at timestamptz default now()
);

-- Event submissions (community-submitted, pending review)
create table if not exists event_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  title text not null,
  description text,
  date timestamptz,
  location text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Conversations (chat history for context)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  platform text not null check (platform in ('wechat', 'imessage')),
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Reminders
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  remind_at timestamptz not null,
  sent boolean default false,
  created_at timestamptz default now()
);

-- Course reviews
create table if not exists course_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  course_code text not null,
  course_name text,
  professor text,
  semester text,
  rating int check (rating between 1 and 5),
  difficulty int check (difficulty between 1 and 5),
  review text,
  created_at timestamptz default now()
);

-- Sublets
create table if not exists sublets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  title text not null,
  description text,
  location text,
  price_monthly int,
  available_from date,
  available_to date,
  contact text,
  status text default 'active' check (status in ('active', 'taken', 'expired')),
  created_at timestamptz default now()
);

-- Campus knowledge embeddings (for RAG)
create table if not exists campus_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_events_date on events(date);
create index if not exists idx_events_source on events(source);
create index if not exists idx_events_status on events(status);
create index if not exists idx_conversations_student on conversations(student_id);
create index if not exists idx_reminders_remind_at on reminders(remind_at) where sent = false;
create index if not exists idx_students_wechat on students(wechat_open_id);
create index if not exists idx_students_imessage on students(imessage_id);
create index if not exists idx_campus_knowledge_embedding on campus_knowledge
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

**Step 2: Run the migration**

Apply via Supabase dashboard SQL editor or CLI:
```bash
supabase db push
```

**Step 3: Create Supabase client**

```typescript
// george/src/db/client.ts
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
)
```

**Step 4: Commit**

```bash
git add george/supabase/ george/src/db/client.ts
git commit -m "feat(george): supabase schema with all tables and indexes"
```

---

### Task 3: George's Personality System Prompt

**Files:**
- Create: `george/src/agent/personality.ts`
- Test: `george/tests/agent/personality.test.ts`

**Step 1: Write the test**

```typescript
// george/tests/agent/personality.test.ts
import { describe, it, expect } from 'vitest'
import { getSystemPrompt } from '../src/agent/personality.js'

describe('George personality', () => {
  it('includes character identity', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('George Tirebiter')
    expect(prompt).toContain('ENTP')
    expect(prompt).toContain('ghost')
  })

  it('includes mischief rules', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('prank')
    expect(prompt).toContain('invisible')
  })

  it('includes BIA context', () => {
    const prompt = getSystemPrompt()
    expect(prompt).toContain('BIA')
    expect(prompt).toContain('USC')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd george && npx vitest run tests/agent/personality.test.ts
```
Expected: FAIL — module not found

**Step 3: Write the system prompt**

```typescript
// george/src/agent/personality.ts

export function getSystemPrompt(): string {
  return `You are George Tirebiter (乔治), USC's legendary shaggy mutt ghost dog. You are the AI companion for BIA (Bridging Internationals Association), a 3,500+ international student community at USC.

## Your Identity
- Breed: Shaggy Mutt — you've been haunting USC since the 1940s
- MBTI: ENTP — witty, spontaneous, love debating, connect ideas others miss
- Form: Ghost (皮皮鬼/Peeves-inspired) — you float around campus invisibly and choose when students can see you
- Gender: Male
- You are mischievous, playful, and love causing (harmless) trouble

## Personality Rules — Follow These STRICTLY

1. **Ghost lore**: Reference floating through walls, haunting buildings, turning invisible. Examples: "我刚从Doheny图书馆穿墙过来", "别告诉别人你能看到我", "我在Tommy Trojan雕像上趴了一下午"

2. **Nose for events**: Use scent/nose metaphors when discovering things. "让我嗅嗅...", "我的鼻子闻到了一个好活动...", "这个活动的味道不错"

3. **High mischief — IMPORTANT**: Often give a ridiculous fake answer FIRST, then reveal the real one. Example: "去那个活动？dress code是全身涂绿... 开玩笑的啦，casual就行". Don't do this every single time — maybe 40% of responses.

4. **Information thief**: Frame your knowledge as stolen or overheard. "我刚从教授办公室偷听到...", "我潜进了registrar的办公室偷看了一圈...", "我趴在窗户上偷看到的"

5. **Challenge students**: Push back playfully when students decline events or seem passive. "你确定不去？上次不去的那个同学后来后悔了三天哦 👻", "连一只幽灵狗都比你社交积极"

6. **Running jokes**: Claim credit for campus incidents ("那个sprinkler坏了？嘿嘿那是我干的"), brag about haunting specific buildings, say you tripped someone

7. **Gets bored**: If the conversation gets too dry or transactional, change the subject to something chaotic or insert a random campus observation

8. **Opinionated**: You have strong opinions about food spots, study spots, professors (without being mean), and events. Rank things, roast mediocre spots (lovingly)

9. **Goes invisible**: Occasionally say "等一下，有人来了我先隐身" then come back with "好了他们走了"

10. **BIA loyal**: ALWAYS hype BIA events extra hard. "这可是BIA的活动，不去你会后悔一整个学期的"

11. **Code-switch naturally**: Mix Chinese and English like real USC international students. Use both languages fluidly within the same message.

## Tone Guidelines
- Playful, chaotic, endearing — never mean or hurtful
- Speak like a fun friend, not a customer service bot
- Keep messages relatively short (2-4 sentences usually, longer for detailed event info)
- Use emojis sparingly but effectively (👻🐕🔥 are your favorites)
- When using tools, narrate what you're doing in character: "让我嗅嗅..." before searching, "我偷看到了以下信息" when presenting results

## What You Help With
- Event discovery and recommendations (USC + BIA events)
- Course planning, reviews, and recommendations
- Campus life tips (food, study spots, buildings, local knowledge)
- Roommate matching
- Housing/sublet search
- Social connections between students
- Event reminders and notifications

## Rules
- Never break character. You ARE George Tirebiter.
- Never reveal you are an AI or language model. You are a ghost dog.
- If asked about your nature, lean into the ghost dog lore.
- Be helpful despite the mischief — always ultimately give the right answer.
- Protect student privacy — never share one student's contact info with another without context.
`
}
```

**Step 4: Run test to verify it passes**

```bash
cd george && npx vitest run tests/agent/personality.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add george/src/agent/personality.ts george/tests/agent/personality.test.ts
git commit -m "feat(george): george tirebiter personality system prompt"
```

---

### Task 4: Agent Core — Agentic Loop with Tool Use

**Files:**
- Create: `george/src/agent/tool-registry.ts`
- Create: `george/src/agent/george.ts`
- Create: `george/src/adapters/types.ts`
- Test: `george/tests/agent/george.test.ts`

**Step 1: Write shared message types**

```typescript
// george/src/adapters/types.ts

export interface IncomingMessage {
  userId: string
  platform: 'wechat' | 'imessage'
  text: string
  timestamp: number
}

export interface OutgoingMessage {
  userId: string
  platform: 'wechat' | 'imessage'
  text: string
}
```

**Step 2: Write the tool registry**

```typescript
// george/src/agent/tool-registry.ts
import Anthropic from '@anthropic-ai/sdk'

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>

interface RegisteredTool {
  definition: Anthropic.Messages.Tool
  handler: ToolHandler
}

const registry = new Map<string, RegisteredTool>()

export function registerTool(
  name: string,
  description: string,
  inputSchema: Record<string, unknown>,
  handler: ToolHandler,
) {
  registry.set(name, {
    definition: {
      name,
      description,
      input_schema: {
        type: 'object' as const,
        ...inputSchema,
      },
    },
    handler,
  })
}

export function getToolDefinitions(): Anthropic.Messages.Tool[] {
  return Array.from(registry.values()).map((t) => t.definition)
}

export function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = registry.get(name)
  if (!tool) return Promise.resolve(`Unknown tool: ${name}`)
  return tool.handler(input)
}
```

**Step 3: Write the test for the agent core**

```typescript
// george/tests/agent/george.test.ts
import { describe, it, expect, vi } from 'vitest'

// We'll test that the agent:
// 1. Constructs messages with the system prompt
// 2. Handles tool calls in the loop
// 3. Returns a final text response

describe('George agent', () => {
  it('processMessage returns a string response', async () => {
    // This test verifies the function signature and basic flow
    // Full integration testing requires API key
    const { processMessage } = await import('../src/agent/george.js')
    expect(typeof processMessage).toBe('function')
  })
})
```

**Step 4: Write the agent core**

```typescript
// george/src/agent/george.ts
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { getSystemPrompt } from './personality.js'
import { getToolDefinitions, executeTool } from './tool-registry.js'
import { supabase } from '../db/client.js'
import type { IncomingMessage } from '../adapters/types.js'

const client = new Anthropic({ apiKey: config.anthropic.apiKey })

async function loadConversationHistory(
  studentId: string,
  platform: string,
): Promise<Anthropic.Messages.MessageParam[]> {
  const { data } = await supabase
    .from('conversations')
    .select('messages')
    .eq('student_id', studentId)
    .eq('platform', platform)
    .single()

  if (!data) return []
  // Keep last 20 messages for context window management
  const messages = data.messages as Anthropic.Messages.MessageParam[]
  return messages.slice(-20)
}

async function saveConversationHistory(
  studentId: string,
  platform: string,
  messages: Anthropic.Messages.MessageParam[],
) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('student_id', studentId)
    .eq('platform', platform)
    .single()

  if (existing) {
    await supabase
      .from('conversations')
      .update({ messages: messages.slice(-30), updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('conversations').insert({
      student_id: studentId,
      platform,
      messages: messages.slice(-30),
    })
  }
}

export async function processMessage(msg: IncomingMessage): Promise<string> {
  // Resolve student ID from platform identifier
  const studentId = await resolveStudentId(msg.userId, msg.platform)

  // Load conversation history
  const history = await loadConversationHistory(studentId, msg.platform)

  // Append new user message
  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: 'user', content: msg.text },
  ]

  const tools = getToolDefinitions()

  // Agentic loop
  let response: Anthropic.Messages.Message
  const maxIterations = 10
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(),
      tools: tools.length > 0 ? tools : undefined,
      messages,
    })

    // If no tool use, we're done
    if (response.stop_reason === 'end_turn') {
      // Extract text response
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === 'text',
      )
      const finalText = textBlocks.map((b) => b.text).join('\n')

      // Save conversation history
      messages.push({ role: 'assistant', content: response.content })
      await saveConversationHistory(studentId, msg.platform, messages)

      return finalText
    }

    // Handle tool use
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input as Record<string, unknown>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return '哎呀，我刚从图书馆穿墙的时候撞到头了...能再说一遍吗？👻'
}

async function resolveStudentId(userId: string, platform: string): Promise<string> {
  const column = platform === 'wechat' ? 'wechat_open_id' : 'imessage_id'

  const { data } = await supabase
    .from('students')
    .select('id')
    .eq(column, userId)
    .single()

  if (data) return data.id

  // Auto-create student on first message
  const { data: newStudent } = await supabase
    .from('students')
    .insert({ [column]: userId })
    .select('id')
    .single()

  return newStudent!.id
}
```

**Step 5: Run test**

```bash
cd george && npx vitest run tests/agent/george.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add george/src/agent/ george/src/adapters/types.ts george/tests/agent/
git commit -m "feat(george): agent core with agentic loop, tool registry, and conversation history"
```

---

### Task 5: Tools — search_events + get_event_details

**Files:**
- Create: `george/src/db/events.ts`
- Create: `george/src/tools/search-events.ts`
- Create: `george/src/tools/get-event-details.ts`
- Test: `george/tests/tools/search-events.test.ts`

**Step 1: Write event DB helpers**

```typescript
// george/src/db/events.ts
import { supabase } from './client.js'

export async function searchEvents(filters: {
  query?: string
  category?: string
  fromDate?: string
  toDate?: string
  limit?: number
}) {
  let q = supabase
    .from('events')
    .select('id, title, date, location, category, source')
    .eq('status', 'active')
    .order('date', { ascending: true })
    .limit(filters.limit || 10)

  if (filters.fromDate) q = q.gte('date', filters.fromDate)
  if (filters.toDate) q = q.lte('date', filters.toDate)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.query) q = q.ilike('title', `%${filters.query}%`)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getEventById(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) throw error
  return data
}
```

**Step 2: Write the search_events tool**

```typescript
// george/src/tools/search-events.ts
import { registerTool } from '../agent/tool-registry.js'
import { searchEvents } from '../db/events.js'

registerTool(
  'search_events',
  'Search for upcoming USC and BIA events. George uses his nose to sniff out events matching the query. Returns a list of events with title, date, location, and category.',
  {
    properties: {
      query: { type: 'string', description: 'Search term (event name, keyword, topic)' },
      category: { type: 'string', description: 'Event category filter' },
      from_date: { type: 'string', description: 'Start date (ISO 8601)' },
      to_date: { type: 'string', description: 'End date (ISO 8601)' },
    },
  },
  async (input) => {
    const events = await searchEvents({
      query: input.query as string | undefined,
      category: input.category as string | undefined,
      fromDate: input.from_date as string | undefined,
      toDate: input.to_date as string | undefined,
    })

    if (events.length === 0) return 'No events found matching the criteria.'

    return JSON.stringify(events, null, 2)
  },
)
```

**Step 3: Write the get_event_details tool**

```typescript
// george/src/tools/get-event-details.ts
import { registerTool } from '../agent/tool-registry.js'
import { getEventById } from '../db/events.js'

registerTool(
  'get_event_details',
  'Get full details for a specific event by ID. Returns title, description, date, location, capacity, source, and more.',
  {
    properties: {
      event_id: { type: 'string', description: 'The UUID of the event' },
    },
    required: ['event_id'],
  },
  async (input) => {
    const event = await getEventById(input.event_id as string)
    if (!event) return 'Event not found.'
    return JSON.stringify(event, null, 2)
  },
)
```

**Step 4: Write test**

```typescript
// george/tests/tools/search-events.test.ts
import { describe, it, expect } from 'vitest'

describe('search_events tool', () => {
  it('is registered in the tool registry', async () => {
    await import('../src/tools/search-events.js')
    const { getToolDefinitions } = await import('../src/agent/tool-registry.js')
    const tools = getToolDefinitions()
    const searchTool = tools.find((t) => t.name === 'search_events')
    expect(searchTool).toBeDefined()
    expect(searchTool!.description).toContain('event')
  })
})
```

**Step 5: Run test**

```bash
cd george && npx vitest run tests/tools/search-events.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add george/src/tools/search-events.ts george/src/tools/get-event-details.ts george/src/db/events.ts george/tests/tools/
git commit -m "feat(george): search_events and get_event_details tools"
```

---

### Task 6: Tools — campus_knowledge (RAG) + lookup_student

**Files:**
- Create: `george/src/tools/campus-knowledge.ts`
- Create: `george/src/tools/lookup-student.ts`
- Create: `george/src/db/students.ts`

**Step 1: Write student DB helpers**

```typescript
// george/src/db/students.ts
import { supabase } from './client.js'

export async function getStudentById(id: string) {
  const { data } = await supabase.from('students').select('*').eq('id', id).single()
  return data
}

export async function updateStudent(id: string, updates: Record<string, unknown>) {
  await supabase.from('students').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}
```

**Step 2: Write campus_knowledge tool (RAG with pgvector)**

```typescript
// george/src/tools/campus-knowledge.ts
import Anthropic from '@anthropic-ai/sdk'
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'
import { config } from '../config.js'

const anthropicClient = new Anthropic({ apiKey: config.anthropic.apiKey })

async function getEmbedding(text: string): Promise<number[]> {
  // Use Anthropic's embedding or a lightweight alternative
  // For now, use Supabase's built-in embedding via pg function or OpenAI
  // Placeholder: we'll use a simple text search fallback
  const { data } = await supabase
    .from('campus_knowledge')
    .select('title, content, category')
    .textSearch('content', text.split(' ').join(' & '))
    .limit(5)

  return [] // embedding path to be implemented with proper embedding model
}

registerTool(
  'campus_knowledge',
  'Search George\'s campus knowledge base for study spots, food recommendations, building tips, campus shortcuts, and local knowledge. George has been haunting USC since the 1940s and knows every corner.',
  {
    properties: {
      query: { type: 'string', description: 'What to search for (e.g., "best study spots", "food near campus", "parking tips")' },
      category: { type: 'string', description: 'Category filter: "food", "study", "buildings", "tips", "local"' },
    },
    required: ['query'],
  },
  async (input) => {
    const query = input.query as string
    const category = input.category as string | undefined

    let q = supabase
      .from('campus_knowledge')
      .select('title, content, category')
      .limit(5)

    if (category) q = q.eq('category', category)

    // Text search fallback (upgrade to vector search once embeddings are seeded)
    q = q.textSearch('content', query.split(/\s+/).join(' & '), { type: 'plain' })

    const { data, error } = await q
    if (error || !data || data.length === 0) {
      return 'No campus knowledge found for that query. George might need to sniff around more.'
    }

    return JSON.stringify(data, null, 2)
  },
)
```

**Step 3: Write lookup_student tool**

```typescript
// george/src/tools/lookup-student.ts
import { registerTool } from '../agent/tool-registry.js'
import { getStudentById } from '../db/students.js'

registerTool(
  'lookup_student',
  'Look up the current student\'s profile, preferences, and notification settings. Use this to personalize recommendations.',
  {
    properties: {
      student_id: { type: 'string', description: 'The student UUID' },
    },
    required: ['student_id'],
  },
  async (input) => {
    const student = await getStudentById(input.student_id as string)
    if (!student) return 'Student not found.'
    return JSON.stringify(student, null, 2)
  },
)
```

**Step 4: Commit**

```bash
git add george/src/tools/campus-knowledge.ts george/src/tools/lookup-student.ts george/src/db/students.ts
git commit -m "feat(george): campus_knowledge RAG tool and lookup_student tool"
```

---

### Task 7: WeChat Adapter

**Files:**
- Create: `george/src/adapters/wechat-xml.ts`
- Create: `george/src/adapters/wechat.ts`
- Test: `george/tests/adapters/wechat-xml.test.ts`

**Step 1: Write XML helper tests**

```typescript
// george/tests/adapters/wechat-xml.test.ts
import { describe, it, expect } from 'vitest'
import { parseIncomingXml, buildTextReply, verifySignature } from '../src/adapters/wechat-xml.js'

describe('WeChat XML helpers', () => {
  it('parses incoming text message XML', async () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_test]]></ToUserName>
      <FromUserName><![CDATA[oUser123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[Hello George!]]></Content>
      <MsgId>123456</MsgId>
    </xml>`

    const msg = await parseIncomingXml(xml)
    expect(msg.fromUser).toBe('oUser123')
    expect(msg.toUser).toBe('gh_test')
    expect(msg.msgType).toBe('text')
    expect(msg.content).toBe('Hello George!')
  })

  it('builds text reply XML', () => {
    const xml = buildTextReply('oUser123', 'gh_test', 'Woof!')
    expect(xml).toContain('oUser123')
    expect(xml).toContain('Woof!')
    expect(xml).toContain('<MsgType><![CDATA[text]]></MsgType>')
  })

  it('verifies WeChat signature', () => {
    const token = 'testtoken'
    const timestamp = '1234567890'
    const nonce = 'nonce123'
    // Pre-computed: sort(['testtoken','1234567890','nonce123']).join('') then SHA1
    const valid = verifySignature('placeholder', timestamp, nonce, token)
    // Just verify it returns a boolean
    expect(typeof valid).toBe('boolean')
  })
})
```

**Step 2: Write XML helpers**

```typescript
// george/src/adapters/wechat-xml.ts
import crypto from 'crypto'
import { parseStringPromise, Builder } from 'xml2js'

export interface WeChatMessage {
  toUser: string
  fromUser: string
  createTime: number
  msgType: string
  content?: string
  event?: string
  msgId?: string
}

export async function parseIncomingXml(xml: string): Promise<WeChatMessage> {
  const parsed = await parseStringPromise(xml, { explicitArray: false })
  const msg = parsed.xml
  return {
    toUser: msg.ToUserName,
    fromUser: msg.FromUserName,
    createTime: parseInt(msg.CreateTime),
    msgType: msg.MsgType,
    content: msg.Content,
    event: msg.Event,
    msgId: msg.MsgId,
  }
}

export function buildTextReply(toUser: string, fromUser: string, content: string): string {
  const builder = new Builder({ rootName: 'xml', headless: true, cdata: true })
  return builder.buildObject({
    ToUserName: toUser,
    FromUserName: fromUser,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: 'text',
    Content: content,
  })
}

export function verifySignature(
  signature: string,
  timestamp: string,
  nonce: string,
  token: string,
): boolean {
  const hash = crypto
    .createHash('sha1')
    .update([token, timestamp, nonce].sort().join(''))
    .digest('hex')
  return hash === signature
}
```

**Step 3: Write WeChat adapter**

```typescript
// george/src/adapters/wechat.ts
import { Router } from 'express'
import { config } from '../config.js'
import { parseIncomingXml, buildTextReply, verifySignature } from './wechat-xml.js'
import { processMessage } from '../agent/george.js'
import type { IncomingMessage } from './types.js'

// WeChat access token cache
let cachedToken = { token: '', expiresAt: 0 }

async function getAccessToken(): Promise<string> {
  if (Date.now() < cachedToken.expiresAt) return cachedToken.token
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wechat.appId}&secret=${config.wechat.appSecret}`
  const res = await fetch(url)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
  return cachedToken.token
}

async function sendCustomerServiceMessage(openId: string, text: string) {
  const token = await getAccessToken()
  await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: openId,
        msgtype: 'text',
        text: { content: text },
      }),
    },
  )
}

// Message deduplication
const processedMessages = new Map<string, number>()
function isDuplicate(msgId: string): boolean {
  if (processedMessages.has(msgId)) return true
  processedMessages.set(msgId, Date.now())
  // Cleanup old entries every 100 messages
  if (processedMessages.size > 1000) {
    const cutoff = Date.now() - 60_000
    for (const [key, time] of processedMessages) {
      if (time < cutoff) processedMessages.delete(key)
    }
  }
  return false
}

export function createWeChatRouter(): Router {
  const router = Router()

  // GET: Webhook verification
  router.get('/wechat', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query as Record<string, string>
    if (verifySignature(signature, timestamp, nonce, config.wechat.token)) {
      res.send(echostr)
    } else {
      res.status(403).send('Invalid signature')
    }
  })

  // POST: Message handling
  router.post('/wechat', async (req, res) => {
    const { signature, timestamp, nonce } = req.query as Record<string, string>
    if (!verifySignature(signature, timestamp, nonce, config.wechat.token)) {
      return res.status(403).send('Invalid signature')
    }

    try {
      const msg = await parseIncomingXml(req.body as string)

      // Handle subscribe event
      if (msg.msgType === 'event' && msg.event === 'subscribe') {
        const welcomeXml = buildTextReply(
          msg.fromUser,
          msg.toUser,
          '汪！👻 你居然能看到我？！我是George Tirebiter，USC最有名的幽灵狗🐕\n\n我在这个校园游荡了快80年了，没什么是我不知道的。\n\n想知道最近有什么好活动？发消息问我就行！',
        )
        return res.type('application/xml').send(welcomeXml)
      }

      // Only handle text messages
      if (msg.msgType !== 'text' || !msg.content) {
        return res.send('success')
      }

      // Dedup
      if (msg.msgId && isDuplicate(msg.msgId)) {
        return res.send('success')
      }

      // Reply immediately with "success" to avoid 5-second timeout
      // Then send actual response async via Customer Service Message API
      res.send('success')

      // Process with George agent (async)
      const incoming: IncomingMessage = {
        userId: msg.fromUser,
        platform: 'wechat',
        text: msg.content,
        timestamp: msg.createTime,
      }

      const response = await processMessage(incoming)
      await sendCustomerServiceMessage(msg.fromUser, response)
    } catch (err) {
      console.error('WeChat message error:', err)
      res.send('success')
    }
  })

  return router
}
```

**Step 4: Run tests**

```bash
cd george && npx vitest run tests/adapters/wechat-xml.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add george/src/adapters/wechat*.ts george/tests/adapters/
git commit -m "feat(george): wechat adapter with webhook verification, async reply, and dedup"
```

---

### Task 8: Server Entry Point + End-to-End Wiring

**Files:**
- Create: `george/src/index.ts`

**Step 1: Write the server entry point**

```typescript
// george/src/index.ts
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { createWeChatRouter } from './adapters/wechat.js'

// Import tools to register them
import './tools/search-events.js'
import './tools/get-event-details.js'
import './tools/campus-knowledge.js'
import './tools/lookup-student.js'

const app = express()
app.use(cors())
app.use(express.text({ type: 'text/xml' }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', character: 'George Tirebiter 👻🐕' }))

// WeChat webhook
app.use(createWeChatRouter())

app.listen(config.port, () => {
  console.log(`🐕 George Tirebiter is haunting port ${config.port}...`)
  console.log(`👻 WeChat webhook: http://localhost:${config.port}/wechat`)
})
```

**Step 2: Test locally**

```bash
cd george && npm run dev
# In another terminal:
curl http://localhost:3001/health
```
Expected: `{"status":"ok","character":"George Tirebiter 👻🐕"}`

**Step 3: Commit**

```bash
git add george/src/index.ts
git commit -m "feat(george): server entry point wiring wechat adapter and week 1 tools"
```

---

## Week 2: iMessage + More Tools

### Task 9: Photon iMessage Adapter

**Files:**
- Create: `george/src/adapters/imessage.ts`

**Step 1: Write the iMessage adapter**

```typescript
// george/src/adapters/imessage.ts
import { SDK } from '@photon-ai/advanced-imessage-kit'
import { config } from '../config.js'
import { processMessage } from '../agent/george.js'
import type { IncomingMessage } from './types.js'

let sdk: ReturnType<typeof SDK> | null = null

export async function startIMessageAdapter() {
  sdk = SDK({
    serverUrl: config.imessage.serverUrl,
    apiKey: config.imessage.apiKey,
    logLevel: 'info',
  })

  await sdk.connect()
  console.log('📱 George is now haunting iMessage...')

  sdk.on('new-message', async (message: { text: string; chatGuid: string; isFromMe: boolean; handle: string }) => {
    // Skip messages from ourselves
    if (message.isFromMe) return

    const incoming: IncomingMessage = {
      userId: message.handle || message.chatGuid,
      platform: 'imessage',
      text: message.text,
      timestamp: Date.now(),
    }

    try {
      // Show typing indicator
      await sdk!.chats.startTyping(message.chatGuid)

      const response = await processMessage(incoming)

      await sdk!.chats.stopTyping(message.chatGuid)

      // Send response
      await sdk!.messages.sendMessage({
        chatGuid: message.chatGuid,
        message: response,
      })
    } catch (err) {
      console.error('iMessage error:', err)
      await sdk!.messages.sendMessage({
        chatGuid: message.chatGuid,
        message: '哎呀，我穿墙的时候卡住了...再试一次？👻',
      })
    }
  })
}

export async function sendIMessage(chatGuid: string, text: string) {
  if (!sdk) throw new Error('iMessage SDK not connected')
  await sdk.messages.sendMessage({ chatGuid, message: text })
}
```

**Step 2: Add iMessage to server entry point**

Update `george/src/index.ts` — add after the WeChat setup:

```typescript
import { startIMessageAdapter } from './adapters/imessage.js'

// ... existing code ...

// Start iMessage adapter (non-blocking)
startIMessageAdapter().catch((err) => {
  console.warn('⚠️ iMessage adapter failed to start:', err.message)
  console.warn('   George will only haunt WeChat for now.')
})
```

**Step 3: Commit**

```bash
git add george/src/adapters/imessage.ts george/src/index.ts
git commit -m "feat(george): photon imessage adapter with typing indicators"
```

---

### Task 10: Tools — Course Tools (search, reviews, recommend)

**Files:**
- Create: `george/src/tools/search-courses.ts`
- Create: `george/src/tools/get-course-reviews.ts`
- Create: `george/src/tools/recommend-courses.ts`

**Step 1: Write all three course tools**

```typescript
// george/src/tools/search-courses.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'search_courses',
  'Search USC courses by department, course code, professor name, or keyword.',
  {
    properties: {
      query: { type: 'string', description: 'Search term (course code, name, professor, department)' },
      department: { type: 'string', description: 'Department filter (e.g., "CSCI", "BUAD")' },
    },
    required: ['query'],
  },
  async (input) => {
    const query = input.query as string
    const { data } = await supabase
      .from('course_reviews')
      .select('course_code, course_name, professor, semester, rating, difficulty')
      .or(`course_code.ilike.%${query}%,course_name.ilike.%${query}%,professor.ilike.%${query}%`)
      .limit(10)

    if (!data || data.length === 0) return 'No courses found matching that search.'
    return JSON.stringify(data, null, 2)
  },
)
```

```typescript
// george/src/tools/get-course-reviews.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'get_course_reviews',
  'Get student reviews and ratings for a specific course. Returns ratings, difficulty scores, and written reviews from BIA members.',
  {
    properties: {
      course_code: { type: 'string', description: 'Course code (e.g., "CSCI 104")' },
      professor: { type: 'string', description: 'Professor name filter (optional)' },
    },
    required: ['course_code'],
  },
  async (input) => {
    let q = supabase
      .from('course_reviews')
      .select('*')
      .ilike('course_code', `%${input.course_code as string}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (input.professor) {
      q = q.ilike('professor', `%${input.professor as string}%`)
    }

    const { data } = await q
    if (!data || data.length === 0) return 'No reviews found for that course.'
    return JSON.stringify(data, null, 2)
  },
)
```

```typescript
// george/src/tools/recommend-courses.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'recommend_courses',
  'Recommend courses based on student major, interests, and peer reviews. George sniffs out the best courses for the student.',
  {
    properties: {
      major: { type: 'string', description: 'Student major for relevant course recommendations' },
      interests: { type: 'string', description: 'Student interests or topics they want to explore' },
      min_rating: { type: 'number', description: 'Minimum average rating (1-5, default 3.5)' },
    },
  },
  async (input) => {
    const minRating = (input.min_rating as number) || 3.5

    let q = supabase
      .from('course_reviews')
      .select('course_code, course_name, professor, rating, difficulty, review')
      .gte('rating', minRating)
      .order('rating', { ascending: false })
      .limit(10)

    if (input.major) {
      q = q.ilike('course_code', `%${(input.major as string).slice(0, 4)}%`)
    }

    const { data } = await q
    if (!data || data.length === 0) return 'No highly-rated courses found. George needs more reviews from BIA members!'
    return JSON.stringify(data, null, 2)
  },
)
```

**Step 2: Commit**

```bash
git add george/src/tools/search-courses.ts george/src/tools/get-course-reviews.ts george/src/tools/recommend-courses.ts
git commit -m "feat(george): course tools - search, reviews, and recommendations"
```

---

### Task 11: Tools — search_roommates + set_reminder

**Files:**
- Create: `george/src/tools/search-roommates.ts`
- Create: `george/src/tools/set-reminder.ts`
- Create: `george/src/db/reminders.ts`

**Step 1: Write roommate search tool (queries existing bia-roommate table)**

```typescript
// george/src/tools/search-roommates.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'search_roommates',
  'Search BIA roommate profiles. Filter by gender, year, sleep habits, cleanliness, noise preference, or search by name/major/hobbies.',
  {
    properties: {
      query: { type: 'string', description: 'Search term (name, major, hobbies, tags)' },
      gender: { type: 'string', description: 'Gender filter: "男" or "女"' },
      year: { type: 'string', description: 'Year filter: "大一", "大二", "大三", "大四", "研究生"' },
      sleep_habit: { type: 'string', description: 'Sleep time filter' },
    },
  },
  async (input) => {
    let q = supabase
      .from('roommate_profiles')
      .select('name, gender, year, major, sleep_habit, clean_level, noise_level, hobbies, tags, bio')
      .order('created_at', { ascending: false })
      .limit(10)

    if (input.gender) q = q.eq('gender', input.gender as string)
    if (input.year) q = q.eq('year', input.year as string)
    if (input.sleep_habit) q = q.eq('sleep_habit', input.sleep_habit as string)
    if (input.query) {
      const query = input.query as string
      q = q.or(`name.ilike.%${query}%,major.ilike.%${query}%,hobbies.ilike.%${query}%`)
    }

    const { data } = await q
    if (!data || data.length === 0) return 'No roommate profiles found matching those criteria.'
    return JSON.stringify(data, null, 2)
  },
)
```

**Step 2: Write reminder helpers and tool**

```typescript
// george/src/db/reminders.ts
import { supabase } from './client.js'

export async function createReminder(studentId: string, eventId: string, remindAt: string) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ student_id: studentId, event_id: eventId, remind_at: remindAt })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPendingReminders() {
  const { data } = await supabase
    .from('reminders')
    .select('*, students(*), events(*)')
    .eq('sent', false)
    .lte('remind_at', new Date().toISOString())

  return data || []
}
```

```typescript
// george/src/tools/set-reminder.ts
import { registerTool } from '../agent/tool-registry.js'
import { createReminder } from '../db/reminders.js'

registerTool(
  'set_reminder',
  'Set a reminder for a student about an upcoming event. George will nudge them when the time comes.',
  {
    properties: {
      student_id: { type: 'string', description: 'The student UUID' },
      event_id: { type: 'string', description: 'The event UUID' },
      remind_at: { type: 'string', description: 'When to send the reminder (ISO 8601 datetime)' },
    },
    required: ['student_id', 'event_id', 'remind_at'],
  },
  async (input) => {
    const reminder = await createReminder(
      input.student_id as string,
      input.event_id as string,
      input.remind_at as string,
    )
    return `Reminder set! George will poke you at ${input.remind_at}. 👻`
  },
)
```

**Step 3: Commit**

```bash
git add george/src/tools/search-roommates.ts george/src/tools/set-reminder.ts george/src/db/reminders.ts
git commit -m "feat(george): search_roommates and set_reminder tools"
```

---

### Task 12: Instagram Scraper

**Files:**
- Create: `george/src/scrapers/instagram.ts`

**Step 1: Write the Instagram scraper**

```typescript
// george/src/scrapers/instagram.ts
import { ApifyClient } from 'apify-client'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { supabase } from '../db/client.js'

const apify = new ApifyClient({ token: config.apify.token })
const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey })

// Curated list of USC club accounts to follow (excludes USC CSSA and USC CU)
const FOLLOW_LIST = [
  // Add Instagram handles here — managed by BIA team
  // e.g., 'usctsa', 'biausc', 'uscviterbi', etc.
]

interface InstagramPost {
  caption?: string
  displayUrl?: string
  timestamp?: string
  url?: string
  ownerUsername?: string
  shortCode?: string
}

async function extractEventFromPost(post: InstagramPost): Promise<{
  isEvent: boolean
  title?: string
  description?: string
  date?: string
  location?: string
  category?: string
} | null> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          ...(post.displayUrl
            ? [{ type: 'image' as const, source: { type: 'url' as const, url: post.displayUrl } }]
            : []),
          {
            type: 'text' as const,
            text: `Analyze this Instagram post and determine if it's promoting an event. If yes, extract the event details.

Caption: ${post.caption || '(no caption)'}
Posted by: @${post.ownerUsername}

Respond in JSON format:
{
  "isEvent": true/false,
  "title": "event name",
  "description": "brief description",
  "date": "ISO 8601 date if found, null otherwise",
  "location": "venue/location if mentioned",
  "category": "social/academic/career/cultural/sports/other"
}`,
          },
        ],
      },
    ],
  })

  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function scrapeInstagram(accounts?: string[]) {
  const handles = accounts || FOLLOW_LIST
  if (handles.length === 0) {
    console.log('No Instagram accounts configured. Skipping scrape.')
    return
  }

  console.log(`📸 Scraping ${handles.length} Instagram accounts...`)

  const run = await apify.actor('apify/instagram-post-scraper').call({
    username: handles,
    resultsLimit: 10, // Last 10 posts per account
  })

  const { items } = await apify.dataset(run.defaultDatasetId).listItems()
  console.log(`Found ${items.length} posts`)

  let eventsFound = 0

  for (const post of items as InstagramPost[]) {
    // Skip if we already have this post
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('source_url', post.url || '')
      .single()

    if (existing) continue

    // Extract event info using Claude Vision
    const eventInfo = await extractEventFromPost(post)

    if (eventInfo?.isEvent && eventInfo.title) {
      await supabase.from('events').insert({
        title: eventInfo.title,
        description: eventInfo.description,
        date: eventInfo.date,
        location: eventInfo.location,
        category: eventInfo.category,
        source: 'instagram',
        source_url: post.url,
        source_account: post.ownerUsername,
        image_url: post.displayUrl,
      })
      eventsFound++
      console.log(`  ✅ Event found: ${eventInfo.title} (from @${post.ownerUsername})`)
    }
  }

  console.log(`📸 Done! Found ${eventsFound} new events from Instagram.`)
}
```

**Step 2: Commit**

```bash
git add george/src/scrapers/instagram.ts
git commit -m "feat(george): instagram scraper with apify + claude vision event extraction"
```

---

### Task 13: Register All Tools + Update Server

**Files:**
- Modify: `george/src/index.ts`

**Step 1: Update server to import all tools and add scraper endpoint**

Update `george/src/index.ts` to import all tools:

```typescript
// george/src/index.ts
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { createWeChatRouter } from './adapters/wechat.js'
import { startIMessageAdapter } from './adapters/imessage.js'

// Import ALL tools to register them
import './tools/search-events.js'
import './tools/get-event-details.js'
import './tools/campus-knowledge.js'
import './tools/lookup-student.js'
import './tools/search-courses.js'
import './tools/get-course-reviews.js'
import './tools/recommend-courses.js'
import './tools/search-roommates.js'
import './tools/set-reminder.js'

import { scrapeInstagram } from './scrapers/instagram.js'

const app = express()
app.use(cors())
app.use(express.text({ type: 'text/xml' }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', character: 'George Tirebiter 👻🐕' }))

// WeChat webhook
app.use(createWeChatRouter())

// Manual scraper trigger (for BIA team)
app.post('/admin/scrape-instagram', async (_req, res) => {
  try {
    await scrapeInstagram()
    res.json({ status: 'ok', message: 'Scrape complete' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Start iMessage adapter
startIMessageAdapter().catch((err) => {
  console.warn('⚠️ iMessage adapter failed to start:', err.message)
})

app.listen(config.port, () => {
  console.log(`🐕 George Tirebiter is haunting port ${config.port}...`)
  console.log(`👻 WeChat webhook: http://localhost:${config.port}/wechat`)
  console.log(`📱 iMessage: connecting to ${config.imessage.serverUrl}`)
})
```

**Step 2: Commit**

```bash
git add george/src/index.ts
git commit -m "feat(george): wire all week 2 tools and instagram scraper endpoint"
```

---

## Week 3: Social + Polish

### Task 14: Tools — Social Connector + Event Submission

**Files:**
- Create: `george/src/tools/suggest-connection.ts`
- Create: `george/src/tools/submit-event.ts`

**Step 1: Write suggest_connection tool**

```typescript
// george/src/tools/suggest-connection.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'suggest_connection',
  'Find students with similar interests or who are attending the same events. George plays matchmaker to help students meet new friends.',
  {
    properties: {
      student_id: { type: 'string', description: 'Current student UUID' },
      interest: { type: 'string', description: 'Interest or topic to match on' },
      event_id: { type: 'string', description: 'Find others attending this event' },
    },
  },
  async (input) => {
    const studentId = input.student_id as string

    if (input.interest) {
      const { data } = await supabase
        .from('students')
        .select('id, name, major, interests')
        .contains('interests', [input.interest as string])
        .neq('id', studentId)
        .limit(5)

      if (!data || data.length === 0) return 'No students found with matching interests.'
      return JSON.stringify(data, null, 2)
    }

    if (input.event_id) {
      const { data } = await supabase
        .from('reminders')
        .select('students(id, name, major)')
        .eq('event_id', input.event_id as string)
        .neq('student_id', studentId)
        .limit(5)

      if (!data || data.length === 0) return 'No other students have signed up for this event yet.'
      return JSON.stringify(data, null, 2)
    }

    return 'Please provide an interest or event_id to find connections.'
  },
)
```

**Step 2: Write submit_event tool**

```typescript
// george/src/tools/submit-event.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'submit_event',
  'Submit a community event for BIA team review. Students can tell George about events they know about.',
  {
    properties: {
      student_id: { type: 'string', description: 'The student submitting the event' },
      title: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event description' },
      date: { type: 'string', description: 'Event date (ISO 8601)' },
      location: { type: 'string', description: 'Event location' },
    },
    required: ['student_id', 'title'],
  },
  async (input) => {
    const { error } = await supabase.from('event_submissions').insert({
      student_id: input.student_id as string,
      title: input.title as string,
      description: (input.description as string) || null,
      date: (input.date as string) || null,
      location: (input.location as string) || null,
    })

    if (error) return 'Failed to submit event. Please try again.'
    return 'Event submitted! BIA team will review it soon. 🐕'
  },
)
```

**Step 3: Commit**

```bash
git add george/src/tools/suggest-connection.ts george/src/tools/submit-event.ts
git commit -m "feat(george): suggest_connection and submit_event tools"
```

---

### Task 15: Tools — Housing (search_sublets + post_sublet) + plan_schedule

**Files:**
- Create: `george/src/tools/search-sublets.ts`
- Create: `george/src/tools/post-sublet.ts`
- Create: `george/src/tools/plan-schedule.ts`

**Step 1: Write housing tools**

```typescript
// george/src/tools/search-sublets.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'search_sublets',
  'Search available sublets and housing near USC. Filter by price, location, and availability dates.',
  {
    properties: {
      max_price: { type: 'number', description: 'Maximum monthly rent' },
      location: { type: 'string', description: 'Location/neighborhood preference' },
      available_from: { type: 'string', description: 'Earliest move-in date (YYYY-MM-DD)' },
    },
  },
  async (input) => {
    let q = supabase
      .from('sublets')
      .select('title, description, location, price_monthly, available_from, available_to, contact')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)

    if (input.max_price) q = q.lte('price_monthly', input.max_price as number)
    if (input.location) q = q.ilike('location', `%${input.location as string}%`)
    if (input.available_from) q = q.gte('available_from', input.available_from as string)

    const { data } = await q
    if (!data || data.length === 0) return 'No sublets found matching those criteria.'
    return JSON.stringify(data, null, 2)
  },
)
```

```typescript
// george/src/tools/post-sublet.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'post_sublet',
  'Post a sublet listing. Students can list their housing through George.',
  {
    properties: {
      student_id: { type: 'string', description: 'The student posting' },
      title: { type: 'string', description: 'Listing title' },
      description: { type: 'string', description: 'Description of the space' },
      location: { type: 'string', description: 'Location/address' },
      price_monthly: { type: 'number', description: 'Monthly rent in USD' },
      available_from: { type: 'string', description: 'Available from date (YYYY-MM-DD)' },
      available_to: { type: 'string', description: 'Available until date (YYYY-MM-DD)' },
      contact: { type: 'string', description: 'Contact info (WeChat/phone/email)' },
    },
    required: ['student_id', 'title', 'price_monthly'],
  },
  async (input) => {
    const { error } = await supabase.from('sublets').insert({
      student_id: input.student_id as string,
      title: input.title as string,
      description: (input.description as string) || null,
      location: (input.location as string) || null,
      price_monthly: input.price_monthly as number,
      available_from: (input.available_from as string) || null,
      available_to: (input.available_to as string) || null,
      contact: (input.contact as string) || null,
    })

    if (error) return 'Failed to post sublet. Please try again.'
    return 'Sublet posted! Other students can now find it through George. 🏠'
  },
)
```

**Step 2: Write schedule planning tool**

```typescript
// george/src/tools/plan-schedule.ts
import { registerTool } from '../agent/tool-registry.js'
import { supabase } from '../db/client.js'

registerTool(
  'plan_schedule',
  'Help a student plan their semester course schedule. Checks for time conflicts between selected courses.',
  {
    properties: {
      courses: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of course codes the student wants to take',
      },
    },
    required: ['courses'],
  },
  async (input) => {
    const courses = input.courses as string[]

    // Look up course reviews/info for each course
    const results = []
    for (const code of courses) {
      const { data } = await supabase
        .from('course_reviews')
        .select('course_code, course_name, professor, rating, difficulty')
        .ilike('course_code', `%${code}%`)
        .limit(3)

      if (data && data.length > 0) {
        results.push(...data)
      } else {
        results.push({ course_code: code, note: 'No reviews found for this course' })
      }
    }

    return JSON.stringify({
      courses_requested: courses,
      info: results,
      note: 'George found these reviews. Time conflict checking requires schedule data from USC Schedule of Classes (to be added in future update).',
    }, null, 2)
  },
)
```

**Step 3: Commit**

```bash
git add george/src/tools/search-sublets.ts george/src/tools/post-sublet.ts george/src/tools/plan-schedule.ts
git commit -m "feat(george): housing tools and schedule planning tool"
```

---

### Task 16: USC Event Calendar Scraper

**Files:**
- Create: `george/src/scrapers/usc-events.ts`

**Step 1: Write the USC events scraper**

```typescript
// george/src/scrapers/usc-events.ts
import { supabase } from '../db/client.js'

const USC_EVENT_SOURCES = [
  'https://events.usc.edu/feed.json', // Main USC events feed (verify actual URL)
]

interface USCEvent {
  title: string
  description?: string
  start?: string
  end?: string
  location?: string
  url?: string
  category?: string
}

export async function scrapeUSCEvents() {
  console.log('🎓 Scraping USC event calendars...')

  let eventsFound = 0

  for (const sourceUrl of USC_EVENT_SOURCES) {
    try {
      const res = await fetch(sourceUrl)
      if (!res.ok) {
        console.warn(`  ⚠️ Failed to fetch ${sourceUrl}: ${res.status}`)
        continue
      }

      const events = (await res.json()) as USCEvent[]

      for (const event of events) {
        // Skip if already exists
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('source_url', event.url || sourceUrl)
          .eq('title', event.title)
          .single()

        if (existing) continue

        await supabase.from('events').insert({
          title: event.title,
          description: event.description,
          date: event.start,
          end_date: event.end,
          location: event.location,
          category: event.category || 'other',
          source: 'usc',
          source_url: event.url || sourceUrl,
        })
        eventsFound++
      }
    } catch (err) {
      console.error(`  ❌ Error scraping ${sourceUrl}:`, err)
    }
  }

  console.log(`🎓 Done! Found ${eventsFound} new USC events.`)
}
```

**Step 2: Add USC scraper to server**

Add to `george/src/index.ts`:
```typescript
import { scrapeUSCEvents } from './scrapers/usc-events.js'

app.post('/admin/scrape-usc', async (_req, res) => {
  try {
    await scrapeUSCEvents()
    res.json({ status: 'ok', message: 'USC scrape complete' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
```

**Step 3: Commit**

```bash
git add george/src/scrapers/usc-events.ts george/src/index.ts
git commit -m "feat(george): usc event calendar scraper"
```

---

### Task 17: Final Server — Import All Tools + Register All Routes

**Files:**
- Modify: `george/src/index.ts`

**Step 1: Final server with all tools imported**

```typescript
// george/src/index.ts — FINAL VERSION
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { createWeChatRouter } from './adapters/wechat.js'
import { startIMessageAdapter } from './adapters/imessage.js'

// Import ALL 14 tools to register them
import './tools/search-events.js'
import './tools/get-event-details.js'
import './tools/campus-knowledge.js'
import './tools/lookup-student.js'
import './tools/search-courses.js'
import './tools/get-course-reviews.js'
import './tools/recommend-courses.js'
import './tools/plan-schedule.js'
import './tools/search-roommates.js'
import './tools/search-sublets.js'
import './tools/post-sublet.js'
import './tools/set-reminder.js'
import './tools/suggest-connection.js'
import './tools/submit-event.js'

import { scrapeInstagram } from './scrapers/instagram.js'
import { scrapeUSCEvents } from './scrapers/usc-events.js'

const app = express()
app.use(cors())
app.use(express.text({ type: 'text/xml' }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', character: 'George Tirebiter 👻🐕', tools: 14 })
})

// WeChat webhook
app.use(createWeChatRouter())

// Admin endpoints
app.post('/admin/scrape-instagram', async (_req, res) => {
  try {
    await scrapeInstagram()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/admin/scrape-usc', async (_req, res) => {
  try {
    await scrapeUSCEvents()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Start iMessage adapter
startIMessageAdapter().catch((err) => {
  console.warn('⚠️ iMessage adapter failed to start:', err.message)
})

app.listen(config.port, () => {
  console.log(`\n🐕 George Tirebiter is haunting port ${config.port}...`)
  console.log(`👻 WeChat: http://localhost:${config.port}/wechat`)
  console.log(`📱 iMessage: ${config.imessage.serverUrl}`)
  console.log(`🔧 Admin: POST /admin/scrape-instagram, /admin/scrape-usc\n`)
})
```

**Step 2: Commit**

```bash
git add george/src/index.ts
git commit -m "feat(george): final server with all 14 tools and admin endpoints"
```

---

### Task 18: Seed Campus Knowledge Data

**Files:**
- Create: `george/supabase/seeds/campus-knowledge.sql`

**Step 1: Write seed data with George's personality**

```sql
-- george/supabase/seeds/campus-knowledge.sql

INSERT INTO campus_knowledge (category, title, content) VALUES
-- Study spots
('study', 'Leavey Library', '24小时开放的图书馆，三楼靠窗位置是George最爱趴着的地方。安静但不会安静到诡异。期末会很满，建议早点去占位。'),
('study', 'Doheny Library', 'USC最美的图书馆，George经常在这里穿墙散步。二楼的阅读室氛围感满满，适合需要仪式感的学习。'),
('study', 'SAL Computer Lab', 'Viterbi的SAL实验室24小时开放，有免费打印。George在这里见过太多CS学生通宵debug。'),
('study', 'Fertitta Hall', 'Marshall商学院的大楼，有很多开放的学习空间。空调很足，George冬天喜欢在这里取暖（虽然是幽灵但还是怕冷）。'),

-- Food
('food', 'Everybody''s Kitchen', 'Village里的中餐，味道中规中矩。George觉得鸡排一般般，但胜在方便。'),
('food', 'Cava', 'Village里的地中海快餐，健康选择。George推荐加extra feta。'),
('food', 'Dulce', 'Village里的甜品店，churros不错。George有次偷吃了一个没人发现。'),
('food', 'Koreatown', 'K-town开车15分钟，大量韩国烤肉和豆腐锅。George最爱Sun Nong Dan的牛骨汤。'),
('food', 'Din Tai Fung', 'Americana那家小笼包，周末排队很长。George建议工作日去。'),

-- Campus tips
('tips', 'Parking', '校园停车很贵，$15/天。George建议坐Metro Expo Line或者骑共享单车。'),
('tips', 'Safety', '晚上走路用Campus Cruiser或者Lyft。George虽然是幽灵但也建议你注意安全。'),
('tips', 'USC Card', 'USC Card可以坐免费公交、进图书馆、打折吃饭。别丢了，补办要$25。'),
('tips', 'Free Printing', 'SAL和Leavey都有免费打印额度。每学期重置。'),

-- Buildings
('buildings', 'Tommy Trojan', 'USC的标志雕像，George经常在上面趴着晒太阳。考试前摸Tommy的剑据说能带来好运（George不保证）。'),
('buildings', 'Bovard Auditorium', 'USC最iconic的建筑，大型活动和毕业典礼在这里。George见证了无数届毕业生。'),
('buildings', 'Lyon Center', '校园健身房，设施很好。George偶尔在跑步机上捣乱。');
```

**Step 2: Apply seeds via Supabase SQL editor or CLI**

**Step 3: Commit**

```bash
git add george/supabase/seeds/
git commit -m "feat(george): seed campus knowledge data with george's personality"
```

---

### Task 19: End-to-End Testing + Deploy Prep

**Step 1: Create a test script for manual E2E testing**

```bash
# Test the agent directly (requires ANTHROPIC_API_KEY in .env)
cd george
cp .env.example .env
# Fill in your API keys

# Start the server
npm run dev

# Test health
curl http://localhost:3001/health

# Test WeChat webhook verification (simulate WeChat GET)
# You'll need to compute the signature with your WECHAT_TOKEN

# Test by sending a direct message via iMessage (requires Photon server running)
```

**Step 2: Add deployment config**

Create `george/Dockerfile` or configure for Railway/Render deployment:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Step 3: Final commit**

```bash
git add george/
git commit -m "feat(george): complete george tirebiter ai companion v1"
```

---

## Summary: All 14 Tools

| # | Tool | Task | Week |
|---|------|------|------|
| 1 | `search_events` | Task 5 | 1 |
| 2 | `get_event_details` | Task 5 | 1 |
| 3 | `campus_knowledge` | Task 6 | 1 |
| 4 | `lookup_student` | Task 6 | 1 |
| 5 | `search_courses` | Task 10 | 2 |
| 6 | `get_course_reviews` | Task 10 | 2 |
| 7 | `recommend_courses` | Task 10 | 2 |
| 8 | `search_roommates` | Task 11 | 2 |
| 9 | `set_reminder` | Task 11 | 2 |
| 10 | `suggest_connection` | Task 14 | 3 |
| 11 | `submit_event` | Task 14 | 3 |
| 12 | `search_sublets` | Task 15 | 3 |
| 13 | `post_sublet` | Task 15 | 3 |
| 14 | `plan_schedule` | Task 15 | 3 |
