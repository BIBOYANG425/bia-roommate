import { readFile, readdir } from 'fs/promises'
import { basename, extname, join as pathJoin } from 'path'
import yaml from 'js-yaml'
import type { Skill, SkillTier } from './types.js'
import type { SubAgent } from '../agent/personality.js'

const VALID_SUB_AGENTS: SubAgent[] = ['event', 'course', 'housing', 'social', 'campus']
const FRONTMATTER_DELIMITER = /^---\r?\n/

interface RawFrontmatter {
  name?: unknown
  description?: unknown
  tier?: unknown
  sub_agent?: unknown
  tools?: unknown
}

export async function parseSkillFile(filePath: string): Promise<Skill> {
  const raw = await readFile(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw, filePath)

  const fm = yaml.load(frontmatter) as RawFrontmatter
  if (!fm || typeof fm !== 'object') {
    throw new Error(`${filePath}: frontmatter is not a YAML object`)
  }

  const name = requireString(fm.name, 'name', filePath)
  const description = requireString(fm.description, 'description', filePath)
  const tier = requireString(fm.tier, 'tier', filePath) as SkillTier

  const expectedName = basename(filePath, extname(filePath))
  if (name !== expectedName) {
    throw new Error(
      `${filePath}: frontmatter name "${name}" does not match filename "${expectedName}"`,
    )
  }

  if (tier !== 'orchestrator' && tier !== 'sub-agent') {
    throw new Error(`${filePath}: tier must be 'orchestrator' or 'sub-agent', got "${tier}"`)
  }

  let subAgent: SubAgent | undefined
  if (tier === 'sub-agent') {
    const value = requireString(fm.sub_agent, 'sub_agent', filePath)
    if (!VALID_SUB_AGENTS.includes(value as SubAgent)) {
      throw new Error(
        `${filePath}: sub_agent must be one of ${VALID_SUB_AGENTS.join(', ')}, got "${value}"`,
      )
    }
    subAgent = value as SubAgent
  }

  const tools = requireStringArray(fm.tools, 'tools', filePath)

  return { name, description, tier, subAgent, tools, body, filePath }
}

function splitFrontmatter(raw: string, filePath: string): { frontmatter: string; body: string } {
  if (!FRONTMATTER_DELIMITER.test(raw)) {
    throw new Error(`${filePath}: file must start with '---' frontmatter delimiter`)
  }
  const afterFirst = raw.replace(FRONTMATTER_DELIMITER, '')
  const closeIndex = afterFirst.search(/^---\r?\n/m)
  if (closeIndex === -1) {
    throw new Error(`${filePath}: missing closing '---' frontmatter delimiter`)
  }
  const frontmatter = afterFirst.slice(0, closeIndex)
  const body = afterFirst.slice(closeIndex).replace(FRONTMATTER_DELIMITER, '').trim()
  return { frontmatter, body }
}

function requireString(value: unknown, field: string, filePath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${filePath}: frontmatter field "${field}" is required and must be a non-empty string`)
  }
  return value
}

function requireStringArray(value: unknown, field: string, filePath: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`${filePath}: frontmatter field "${field}" must be an array of strings`)
  }
  return value
}

export async function walkSkillsDirectory(rootDir: string): Promise<Skill[]> {
  const files: string[] = []
  await collectMarkdownFiles(rootDir, files)

  const skills: Skill[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      skills.push(await parseSkillFile(file))
    } catch (err) {
      errors.push((err as Error).message)
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} skill files failed to load:\n${errors.map((e) => '  - ' + e).join('\n')}`,
    )
  }

  return skills
}

async function collectMarkdownFiles(dir: string, out: string[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    const fullPath = pathJoin(dir, entry.name)
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, out)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(fullPath)
    }
  }
}
