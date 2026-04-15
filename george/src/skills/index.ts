import type { Skill } from './types.js'
import type { SubAgent } from '../agent/personality.js'
import { walkSkillsDirectory } from './loader.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const skillsByName = new Map<string, Skill>()
const orchestratorSkills: Skill[] = []
const subAgentSkills = new Map<SubAgent, Skill[]>()

export function _resetForTest(): void {
  skillsByName.clear()
  orchestratorSkills.length = 0
  subAgentSkills.clear()
}

export function buildRegistry(skills: Skill[], registeredTools: Set<string>): void {
  for (const skill of skills) {
    if (skillsByName.has(skill.name)) {
      const existing = skillsByName.get(skill.name)!
      throw new Error(
        `duplicate skill name "${skill.name}" in ${skill.filePath} and ${existing.filePath}`,
      )
    }
    for (const tool of skill.tools) {
      if (!registeredTools.has(tool)) {
        throw new Error(
          `${skill.filePath}: skill "${skill.name}" references unknown tool "${tool}"`,
        )
      }
    }
    skillsByName.set(skill.name, skill)
    if (skill.tier === 'orchestrator') {
      orchestratorSkills.push(skill)
    } else if (skill.subAgent) {
      const list = subAgentSkills.get(skill.subAgent) ?? []
      list.push(skill)
      subAgentSkills.set(skill.subAgent, list)
    }
  }
  orchestratorSkills.sort((a, b) => a.name.localeCompare(b.name))
  for (const list of subAgentSkills.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export function getCatalogFor(subAgent: SubAgent): string {
  const lines: string[] = ['## Skill Catalog']
  lines.push('When a situation matches one of these descriptions, call load_skill({ name }) to fetch the full playbook.')
  lines.push('')
  lines.push('Orchestrator (always available):')
  for (const s of orchestratorSkills) {
    lines.push(`- ${s.name}: ${s.description}`)
  }
  const list = subAgentSkills.get(subAgent) ?? []
  if (list.length > 0) {
    lines.push('')
    lines.push(`${subAgent}-specific:`)
    for (const s of list) {
      lines.push(`- ${s.name}: ${s.description}`)
    }
  }
  return lines.join('\n')
}

export function getSkillBody(name: string): string | null {
  return skillsByName.get(name)?.body ?? null
}

export function getRegistryStats(): {
  orchestratorCount: number
  perSubAgent: Record<string, number>
  totalCount: number
} {
  const perSubAgent: Record<string, number> = {}
  for (const [agent, list] of subAgentSkills.entries()) {
    perSubAgent[agent] = list.length
  }
  return {
    orchestratorCount: orchestratorSkills.length,
    perSubAgent,
    totalCount: skillsByName.size,
  }
}

/**
 * Boot-time entry: walks the production skills directory and builds the registry.
 * Call this once at server startup AFTER all tools have been registered.
 */
export async function loadAllSkills(registeredTools: Set<string>): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const skillsRoot = join(__dirname) // src/skills/
  const skills = await walkSkillsDirectory(skillsRoot)
  buildRegistry(skills, registeredTools)
}
