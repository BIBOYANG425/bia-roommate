/**
 * Behavior-level test for PR #40's "ask before recommend" course-voice rule.
 *
 * The earlier prompt-substring test (personality.test.ts) only checks that
 * the *string* "先问后答的硬流程" lives in the prompt. That doesn't
 * guarantee the LLM is actually wired to call get_student_academic_state
 * first. Here we go one level deeper:
 *
 *   - Mock the Claude client so we control its "tool_use" decision.
 *   - Run runSubAgent('course', '我该选啥课', []).
 *   - Assert the system prompt sent to Claude includes the hard rule
 *     AND mentions get_student_academic_state.
 *   - Assert the tools array sent to Claude has
 *     get_student_academic_state listed FIRST.
 *   - Confirm a get_student_academic_state tool_use response is dispatched
 *     to the real tool and the loop continues without crashing.
 *
 * If someone reorders SUB_AGENT_TOOLS.course or deletes the ask-first
 * block from personality, this test goes red even if the substring
 * sanity check still passes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub required env vars BEFORE any module load — config.ts throws on missing keys.
process.env.ANTHROPIC_API_KEY ||= 'test-key'
process.env.SUPABASE_URL ||= 'http://localhost'
process.env.SUPABASE_ANON_KEY ||= 'test-key'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key'

let lastCreateArgs: Record<string, unknown> | null = null
let createCallCount = 0

vi.mock('../../src/agent/llm-providers.js', () => ({
  getClaudeClient: vi.fn(() => ({
    messages: {
      create: vi.fn(async (args: Record<string, unknown>) => {
        lastCreateArgs = args
        createCallCount += 1
        if (createCallCount === 1) {
          // First call: LLM picks get_student_academic_state.
          return {
            content: [
              {
                type: 'tool_use',
                id: 'call_1',
                name: 'get_student_academic_state',
                input: { student_id: 'stu-test' },
              },
            ],
            stop_reason: 'tool_use',
          }
        }
        // Second call (after tool result with missing flags): LLM asks back.
        return {
          content: [
            { type: 'text', text: '你大几？这学期想修几 units？GE 还差哪些？' },
          ],
          stop_reason: 'end_turn',
        }
      }),
    },
  })),
}))

// Supabase mock so get_student_academic_state can run.
vi.mock('../../src/db/client.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'students') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }
      if (table === 'student_memories') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        }
      }
      return {}
    }),
  },
}))

vi.mock('../../src/skills/index.js', () => ({
  getCatalogFor: vi.fn(() => ''),
  loadAllSkills: vi.fn(async () => {}),
  getRegistryStats: vi.fn(() => ({})),
}))

vi.mock('../../src/observability/logger.js', () => ({
  log: vi.fn(),
}))

describe('course sub-agent — ask-first wiring', () => {
  beforeEach(() => {
    vi.resetModules()
    lastCreateArgs = null
    createCallCount = 0
  })

  it('prompt + tools sent to Claude both feature get_student_academic_state', async () => {
    // Register the real tool by side-effect import.
    await import('../../src/tools/get-student-academic-state.js')
    // Other tools too, so getToolsByNames doesn't return undefineds.
    await import('../../src/tools/search-courses.js')
    await import('../../src/tools/describe-course.js')
    await import('../../src/tools/get-course-reviews.js')
    await import('../../src/tools/get-rmp-ratings.js')
    await import('../../src/tools/recommend-courses.js')
    await import('../../src/tools/plan-schedule.js')
    await import('../../src/tools/course-tips.js')
    await import('../../src/tools/search-programs.js')
    await import('../../src/tools/lookup-student.js')
    await import('../../src/tools/load-skill.js')

    const { runSubAgent, SUB_AGENT_TOOLS } = await import('../../src/agent/george.js')

    // First-place ordering is the contract: George's prompt directs the LLM
    // to "FIRST call get_student_academic_state". If it's not first in the
    // tool list, the LLM has less of a presence prior on it.
    expect(SUB_AGENT_TOOLS.course[0]).toBe('get_student_academic_state')

    const response = await runSubAgent('course', '我该选啥课', [], {
      memories: [],
      isOnboarding: false,
      isFirstContact: false,
      onboardingTurnCount: 0,
      referralCount: 0,
      studentId: 'stu-test',
      platform: 'imessage',
    })

    // The mocked LLM should have been called twice: once for the tool, once for the final reply.
    expect(createCallCount).toBe(2)
    expect(response).toContain('你大几')

    // System prompt — combined static + dynamic — must include both the
    // ask-first hard rule and a reference to the academic-state tool.
    expect(lastCreateArgs).toBeTruthy()
    const systemBlocks = (lastCreateArgs!.system as Array<{ text: string }>)
    const systemText = systemBlocks.map((b) => b.text).join('\n')
    expect(systemText).toContain('先问后答的硬流程')
    expect(systemText).toContain('get_student_academic_state')

    // Tool list passed to Claude: get_student_academic_state must appear and be first.
    const tools = lastCreateArgs!.tools as Array<{ name: string }>
    expect(tools[0].name).toBe('get_student_academic_state')
    expect(tools.find((t) => t.name === 'search_courses')).toBeDefined()
  })
})
