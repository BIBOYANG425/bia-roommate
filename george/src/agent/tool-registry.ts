import Anthropic from '@anthropic-ai/sdk'
import { log } from '../observability/logger.js'

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
      input_schema: { type: 'object' as const, ...inputSchema },
    },
    handler,
  })
}

export function getToolDefinitions(): Anthropic.Messages.Tool[] {
  return Array.from(registry.values()).map((t) => t.definition)
}

export function getToolsByNames(names: string[]): Anthropic.Messages.Tool[] {
  return names
    .map((name) => registry.get(name)?.definition)
    .filter((d): d is Anthropic.Messages.Tool => !!d)
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = registry.get(name)
  if (!tool) return `Unknown tool: ${name}`

  try {
    const start = Date.now()
    const result = await tool.handler(input)
    log('info', 'tool_executed', { tool: name, durationMs: Date.now() - start })
    return result
  } catch (err) {
    log('error', 'tool_error', { tool: name, error: (err as Error).message })
    return `Tool ${name} failed: ${(err as Error).message}`
  }
}
