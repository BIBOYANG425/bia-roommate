// Immortal-skill distiller — runs the 4 extractor prompts (procedural / interaction /
// memory / personality) over the founder's filtered WeChat transcript in single-pass
// mode (full transcript fits in one Sonnet call). Writes per-dimension Markdown into
// the immortal-skill output dir for manual lift into personality.ts.
//
// Usage: tsx scripts/distill-immortal.ts \
//   --input data/wechat/bia-2024.me.old.json \
//   --skill-base ../.claude/skills/immortal-skill \
//   --output ../.claude/skills/immortals/boyang \
//   --slug boyang --name "Boyang" --persona self
//
// Header last reviewed: 2026-04-16

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { getClaudeClient } from '../src/agent/llm-providers.js'

type Dimension = 'procedural' | 'interaction' | 'memory' | 'personality'
const DIMENSIONS: Dimension[] = ['procedural', 'interaction', 'memory', 'personality']

const OUTPUT_FILENAME: Record<Dimension, string> = {
  procedural: 'procedure.md',
  interaction: 'interaction.md',
  memory: 'memory.md',
  personality: 'personality.md',
}

const PROMPT_FILENAME: Record<Dimension, string> = {
  procedural: 'procedural-extractor.md',
  interaction: 'interaction-extractor.md',
  memory: 'memory-extractor.md',
  personality: 'personality-extractor.md',
}

type Args = {
  input: string
  skillBase: string
  output: string
  slug: string
  name: string
  persona: string
  background: string
  only: Dimension | null
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string): string | null => {
    const i = args.indexOf(flag)
    return i >= 0 && args[i + 1] ? args[i + 1] : null
  }
  const required = (flag: string): string => {
    const v = get(flag)
    if (!v) {
      console.error(`Missing required arg: ${flag}`)
      process.exit(1)
    }
    return v
  }
  const onlyRaw = get('--only')
  const only =
    onlyRaw && (DIMENSIONS as string[]).includes(onlyRaw) ? (onlyRaw as Dimension) : null
  return {
    input: resolve(required('--input')),
    skillBase: resolve(required('--skill-base')),
    output: resolve(required('--output')),
    slug: required('--slug'),
    name: required('--name'),
    persona: get('--persona') ?? 'self',
    background: get('--background') ?? '',
    only,
  }
}

function loadTranscript(input: string): string {
  const parsed = JSON.parse(readFileSync(input, 'utf8')) as
    | Array<Record<string, unknown>>
    | { messages?: Array<Record<string, unknown>> }
  const msgs = Array.isArray(parsed) ? parsed : parsed.messages ?? []
  if (!msgs.length) {
    console.error(`[distill] no messages in ${input}`)
    process.exit(1)
  }
  return msgs
    .map((m) => {
      const time = (m.time as string) ?? ''
      const text = String((m.content ?? m.text ?? '') as string).trim()
      return text ? `[${time}] ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function loadPrompt(skillBase: string, dim: Dimension): string {
  const path = join(skillBase, 'prompts', PROMPT_FILENAME[dim])
  if (!existsSync(path)) {
    console.error(`[distill] missing extractor prompt at ${path}`)
    process.exit(1)
  }
  return readFileSync(path, 'utf8')
}

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true })
}

async function runDimension(
  dim: Dimension,
  transcript: string,
  promptTemplate: string,
  args: Args,
): Promise<string> {
  const claude = getClaudeClient()

  const system =
    `You are executing the immortal-skill ${dim} extractor.\n\n` +
    `=== EXTRACTOR PROMPT (follow exactly) ===\n` +
    promptTemplate +
    `\n=== END EXTRACTOR PROMPT ===\n\n` +
    `Variable bindings for this run:\n` +
    `- {name} = ${args.name}\n` +
    `- {persona} = ${args.persona}\n` +
    `- {background} = ${args.background || '(not provided)'}\n\n` +
    `Output ONLY the Markdown specified in the extractor's output-format section. ` +
    `No preamble, no commentary, no fence blocks around the whole output.`

  const userMessage =
    `Source material — WeChat group messages from ${args.name} (sender filtered, 2024-03 to 2024-12). ` +
    `Each line: \`[YYYY-MM-DD HH:MM:SS] <message>\`.\n\n` +
    `=== TRANSCRIPT START ===\n` +
    transcript +
    `\n=== TRANSCRIPT END ===\n\n` +
    `Now produce the ${dim} extraction Markdown per the extractor prompt above. ` +
    `Be specific — quote verbatim where you can, cite the timestamp inline as "(YYYY-MM-DD)" for each verbatim entry. ` +
    `Aim for a thorough output (multiple bullets per section where evidence supports it).`

  console.log(`[distill] ${dim}: calling Sonnet...`)
  const t0 = Date.now()
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const text = response.content.find((b) => b.type === 'text')?.text ?? ''
  console.log(
    `[distill] ${dim}: ${text.length} chars in ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
      `(in ${response.usage.input_tokens} / out ${response.usage.output_tokens} tokens)`,
  )
  return text
}

async function main() {
  const args = parseArgs()
  console.log(`[distill] loading transcript from ${args.input}`)
  const transcript = loadTranscript(args.input)
  console.log(`[distill] transcript: ${transcript.length} chars`)

  ensureDir(args.output)

  const dims = args.only ? [args.only] : DIMENSIONS
  for (const dim of dims) {
    const promptTemplate = loadPrompt(args.skillBase, dim)
    const md = await runDimension(dim, transcript, promptTemplate, args)
    const outPath = join(args.output, OUTPUT_FILENAME[dim])
    writeFileSync(outPath, md)
    console.log(`[distill] wrote ${outPath}`)
  }

  console.log(`\n[distill] done. Files in ${args.output}/`)
  console.log(`Next: human review, then lift verbatim phrases into personality.ts`)
}

main().catch((err) => {
  console.error('[distill] fatal:', err)
  process.exit(1)
})
