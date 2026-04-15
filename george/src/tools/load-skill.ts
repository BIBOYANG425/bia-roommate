import { registerTool } from '../agent/tool-registry.js'
import { getSkillBody } from '../skills/index.js'

registerTool(
  'load_skill',
  'Load the full playbook for a skill by name. Use this when a skill description in the catalog matches the current situation — the returned markdown tells you exactly how to handle it.',
  {
    properties: {
      name: { type: 'string', description: 'The skill name from the catalog' },
    },
    required: ['name'],
  },
  async (input) => {
    const name = input.name
    if (typeof name !== 'string' || name.trim() === '') {
      return "load_skill requires a 'name' argument (string)."
    }
    const body = getSkillBody(name)
    if (body === null) {
      return `Unknown skill: ${name}. Check the catalog for the exact name.`
    }
    return body
  },
)
