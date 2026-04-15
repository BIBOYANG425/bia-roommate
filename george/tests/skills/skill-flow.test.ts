import { describe, it, expect, beforeAll, vi } from 'vitest'

// We mock the Claude client BEFORE importing anything that uses it.
const messagesCreate = vi.fn()
vi.mock('../../src/agent/llm-providers.js', () => ({
  getClaudeClient: () => ({
    messages: { create: messagesCreate },
  }),
  callLightweightLLM: vi.fn(async () => 'event'),
}))

// Mock Supabase-touching functions used inside processMessage.
vi.mock('../../src/db/students.js', () => ({
  resolveStudentId: vi.fn(async () => 'test-student-id'),
  getStudentById: vi.fn(async () => ({
    id: 'test-student-id',
    onboarding_complete: true,
    referred_by: null,
  })),
  loadStudentMemories: vi.fn(async () => []),
  getReferralCount: vi.fn(async () => 0),
  updateStudent: vi.fn(async () => undefined),
  claimLinkCode: vi.fn(),
  generateLinkCode: vi.fn(),
}))

vi.mock('../../src/db/messages.js', () => ({
  loadRecentMessages: vi.fn(async () => []),
  saveMessage: vi.fn(async () => undefined),
}))

// search-events.ts imports searchEvents from ../db/events.js — mock that path.
vi.mock('../../src/db/events.js', () => ({
  searchEvents: vi.fn(async () => [
    {
      id: 'evt-1',
      title: 'BIA x miHoYo Recruiting Night',
      date: '2026-04-18',
      location: 'Tutor Center',
      source: 'bia',
    },
  ]),
}))

vi.mock('../../src/jobs/memory-extraction.js', () => ({
  extractMemories: vi.fn(async () => undefined),
}))

vi.mock('../../src/security/injection-filter.js', () => ({
  checkInjection: () => ({ blocked: false, sanitized: undefined }),
  INJECTION_REJECTIONS: ['blocked'],
}))

vi.mock('../../src/adapters/rate-limiter.js', () => ({
  checkRateLimit: () => ({ allowed: true }),
  RATE_LIMIT_RESPONSE: 'rate limited',
}))

describe('skill flow integration', () => {
  beforeAll(async () => {
    // Register all real tools so load_skill validation succeeds for every
    // production skill (the registry walks the entire skills dir).
    await import('../../src/tools/search-events.js')
    await import('../../src/tools/get-event-details.js')
    await import('../../src/tools/suggest-connection.js')
    await import('../../src/tools/lookup-student.js')
    await import('../../src/tools/load-skill.js')
    await import('../../src/tools/search-roommates.js')
    await import('../../src/tools/plan-schedule.js')
    await import('../../src/tools/get-course-reviews.js')

    // Reset registry in case another test file already built it, then build
    // from the production skills directory.
    const { loadAllSkills, _resetForTest } = await import('../../src/skills/index.js')
    const { getToolDefinitions } = await import('../../src/agent/tool-registry.js')
    _resetForTest()
    await loadAllSkills(new Set(getToolDefinitions().map((t) => t.name)))
  })

  it('runs hype-bia-event end to end via load_skill', async () => {
    let receivedSystem = ''
    messagesCreate
      .mockImplementationOnce(async (req: { system: string }) => {
        receivedSystem = req.system
        return {
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tu-1',
              name: 'load_skill',
              input: { name: 'hype-bia-event' },
            },
          ],
        }
      })
      .mockImplementationOnce(async () => ({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tu-2',
            name: 'search_events',
            input: { query: '招聘', category: 'career' },
          },
        ],
      }))
      .mockImplementationOnce(async () => ({
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: '汪！BIA x miHoYo招聘夜，错过的话我会笑你三天 👻',
          },
        ],
      }))

    const { processMessage } = await import('../../src/agent/george.js')
    const response = await processMessage({
      userId: 'test-user',
      platform: 'imessage',
      text: '有什么招聘活动吗？',
      msgType: 'text',
      timestamp: Date.now(),
    })

    // Skill catalog made it into the system prompt (Task 8 wiring).
    expect(receivedSystem).toContain('## Skill Catalog')
    expect(receivedSystem).toContain('hype-bia-event')

    // Three iterations happened: load_skill -> search_events -> final text.
    expect(messagesCreate).toHaveBeenCalledTimes(3)

    // Final response matches the mocked end_turn text.
    expect(response).toContain('miHoYo')
  })
})
