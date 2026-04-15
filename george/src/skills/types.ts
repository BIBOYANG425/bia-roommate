import type { SubAgent } from '../agent/personality.js'

export type SkillTier = 'orchestrator' | 'sub-agent'

export interface Skill {
  /** Unique identifier; must match the filename stem (no extension). */
  name: string
  /** One-line catalog hook the LLM pattern-matches against. */
  description: string
  /** 'orchestrator' = always visible across all sub-agents; 'sub-agent' = scoped. */
  tier: SkillTier
  /** Required when tier === 'sub-agent'; one of event/course/housing/social/campus. */
  subAgent?: SubAgent
  /** Tool names this skill references; validated against the tool registry at load time. */
  tools: string[]
  /** Markdown body with frontmatter stripped. */
  body: string
  /** Absolute path to the source file (for error messages). */
  filePath: string
}
