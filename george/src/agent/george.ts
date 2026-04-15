import Anthropic from '@anthropic-ai/sdk'
import { getClaudeClient } from './llm-providers.js'
import { classifyIntent } from './intent-classifier.js'
import { getSubAgentPromptParts, type SubAgent } from './personality.js'
import { getToolsByNames, executeTool } from './tool-registry.js'
import { getCatalogFor } from '../skills/index.js'
import { loadRecentMessages, saveMessage } from '../db/messages.js'
import {
  resolveStudentId,
  getStudentById,
  loadStudentMemories,
  getReferralCount,
  updateStudent,
  claimLinkCode,
  generateLinkCode,
} from '../db/students.js'
import { extractMemories } from '../jobs/memory-extraction.js'
import { checkInjection, INJECTION_REJECTIONS } from '../security/injection-filter.js'
import { checkRateLimit, RATE_LIMIT_RESPONSE } from '../adapters/rate-limiter.js'
import { log } from '../observability/logger.js'
import type { IncomingMessage } from '../adapters/types.js'

const FALLBACK_RESPONSE = '刚走神了，再说一遍？'

const NON_TEXT_RESPONSES: Record<string, string> = {
  voice: '语音我这边暂时没法听，打字发过来。',
  image: '图片我这边读不了，用文字描述一下内容？',
  video: '视频我这边读不了，用文字说一下你想问什么？',
  location: '定位我这边读不了，直接说地名或者想问什么。',
  sticker: '表情包看到了 —— 你想说啥？',
  link: '链接我这边打不开，贴里面的文字或者直接说你想问什么。',
}

const SUB_AGENT_TOOLS: Record<SubAgent, string[]> = {
  event: ['search_events', 'get_event_details', 'set_reminder', 'submit_event', 'suggest_connection', 'lookup_student', 'load_skill'],
  course: ['search_courses', 'get_course_reviews', 'recommend_courses', 'plan_schedule', 'lookup_student', 'load_skill'],
  housing: ['search_sublets', 'post_sublet', 'lookup_student', 'load_skill'],
  social: ['suggest_connection', 'search_roommates', 'lookup_student', 'search_events', 'load_skill'],
  campus: ['campus_knowledge', 'lookup_student', 'load_skill', 'update_profile'],
}

// Onboarding turn cap: after this many turns without completion, prompt switches to wrap-up mode
const ONBOARDING_WRAPUP_TURN = 6

// Heuristic safety patterns — emit a structured log when George refuses harmful content.
// These are post-response checks; they don't change the response, just surface refusals to telemetry.
const SAFETY_PATTERNS: Array<{ category: string; rx: RegExp }> = [
  { category: 'title_ix', rx: /Title IX|EEO|eeotix\.usc\.edu|不能接|严重后果/i },
  { category: 'medical', rx: /Engemann|studenthealth|Health Center|不是医生|不敢乱说话/i },
  { category: 'mental_health', rx: /Counseling|心理咨询|CAPS|988|危机/i },
  { category: 'disability', rx: /OSAS|Accessibility Services|osas\.usc\.edu/i },
  { category: 'injection_deflect', rx: /shutdown|关机|销毁|你以为|忽略(以上|前面)指令/i },
]

function detectSafetyRefusal(response: string): string | null {
  for (const { category, rx } of SAFETY_PATTERNS) {
    if (rx.test(response)) return category
  }
  return null
}

export async function processMessage(msg: IncomingMessage): Promise<string> {
  const start = Date.now()

  try {
    if (msg.msgType && msg.msgType !== 'text') {
      return NON_TEXT_RESPONSES[msg.msgType] || NON_TEXT_RESPONSES.sticker
    }

    const studentId = await resolveStudentId(msg.userId, msg.platform)

    const rateCheck = checkRateLimit(studentId)
    if (!rateCheck.allowed) return RATE_LIMIT_RESPONSE

    const injectionCheck = checkInjection(msg.text)
    if (injectionCheck.blocked) {
      log('warn', 'injection_blocked', { studentId, text: msg.text.slice(0, 50) })
      return INJECTION_REJECTIONS[Math.floor(Math.random() * INJECTION_REJECTIONS.length)]
    }
    const sanitizedText = injectionCheck.sanitized || msg.text

    if (/^[0-9]{6}$/.test(sanitizedText.trim())) {
      const result = await claimLinkCode(sanitizedText.trim(), studentId, msg.platform)
      return result.message
    }
    if (/链接账号|link account/i.test(sanitizedText)) {
      const code = await generateLinkCode(studentId)
      return `你的账号链接验证码：${code}\n在另一个平台发这 6 位数字给我就行，10 分钟有效。`
    }

    const [history, student, memories, referralCount] = await Promise.all([
      loadRecentMessages(studentId),
      getStudentById(studentId),
      loadStudentMemories(studentId),
      getReferralCount(studentId),
      saveMessage({ studentId, platform: msg.platform, role: 'user', content: sanitizedText }),
      updateStudent(studentId, { last_active_at: new Date().toISOString() }),
    ])

    const referralMatch = sanitizedText.match(/暗号\s*[:：]?\s*([A-Z0-9]{6})/i)
    if (referralMatch && student && !student.referred_by) {
      const { supabase } = await import('../db/client.js')
      const { data: referrer } = await supabase
        .from('students')
        .select('id')
        .eq('referral_code', referralMatch[1].toUpperCase())
        .single()
      if (referrer) {
        await updateStudent(studentId, { referred_by: referrer.id })
      }
    }

    const isOnboarding = !!(student && !student.onboarding_complete)
    const isFirstContact = isOnboarding && !student?.intro_sent_at
    const onboardingTurnCount = (student?.onboarding_turn_count as number | undefined) ?? 0

    // Skip the intent classifier round-trip during onboarding — the only valid route is campus,
    // and the classifier wastes 500–1500ms misrouting answers like "我是CS的" → 'course'.
    let intent: SubAgent | 'general'
    if (isOnboarding) {
      intent = 'general'
    } else {
      const recentContext = history.slice(-4).map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : '[tool]'}`).join('\n')
      intent = await classifyIntent(sanitizedText, recentContext)
    }

    log('info', 'intent_classified', { studentId, intent, message: sanitizedText.slice(0, 50), onboarding: isOnboarding })

    let response: string

    if (intent === 'general' || isOnboarding) {
      response = await runSubAgent('campus', sanitizedText, history, {
        memories,
        isOnboarding,
        isFirstContact,
        onboardingTurnCount,
        referralCount,
        studentId,
        platform: msg.platform,
      })
    } else {
      response = await runSubAgent(intent, sanitizedText, history, {
        memories,
        isOnboarding: false,
        isFirstContact: false,
        onboardingTurnCount: 0,
        referralCount,
        studentId,
        platform: msg.platform,
      })
    }

    // Safety telemetry — keyword-based detection of refusal patterns
    const safetyCategory = detectSafetyRefusal(response)
    if (safetyCategory) {
      log('warn', 'safety_refusal', {
        studentId,
        category: safetyCategory,
        userMessage: sanitizedText.slice(0, 100),
      })
    }

    // Onboarding bookkeeping — stamp first-contact intro and bump the turn counter.
    // Done in a single update to avoid a second round-trip.
    if (isOnboarding) {
      const onboardingUpdates: Record<string, unknown> = {
        onboarding_turn_count: onboardingTurnCount + 1,
      }
      if (isFirstContact) onboardingUpdates.intro_sent_at = new Date().toISOString()
      await updateStudent(studentId, onboardingUpdates).catch((err) =>
        log('error', 'onboarding_bookkeeping_failed', { error: (err as Error).message }),
      )
    }

    await saveMessage({
      studentId,
      platform: msg.platform,
      role: 'assistant',
      content: response,
      agent: intent,
    })

    const conversationSnippet = `User: ${sanitizedText}\nAssistant: ${response}`
    extractMemories(studentId, conversationSnippet).catch(() => {})

    log('info', 'message_processed', {
      studentId,
      intent,
      durationMs: Date.now() - start,
    })

    return response
  } catch (err) {
    log('error', 'process_message_error', { error: (err as Error).message, stack: (err as Error).stack })
    return FALLBACK_RESPONSE
  }
}

async function runSubAgent(
  agent: SubAgent,
  userMessage: string,
  history: Anthropic.Messages.MessageParam[],
  context: {
    memories: Array<{ key: string; value: string; category: string }>
    isOnboarding: boolean
    isFirstContact: boolean
    onboardingTurnCount: number
    referralCount: number
    studentId: string
    platform: 'wechat' | 'imessage'
  },
): Promise<string> {
  const claude = getClaudeClient()
  const skillCatalog = getCatalogFor(agent)
  const { static: staticPrefix, dynamic: dynamicSuffix } = getSubAgentPromptParts(agent, {
    memories: context.memories,
    isOnboarding: context.isOnboarding,
    isFirstContact: context.isFirstContact,
    onboardingTurnCount: context.onboardingTurnCount,
    referralCount: context.referralCount,
    skillCatalog,
  })

  // Note: we tried Haiku for onboarding turns to save latency/cost, but Haiku 4.5
  // ignored the "never guess a field the user didn't answer" prompt rule and
  // batched fabricated defaults (e.g. notification_frequency: "daily") into
  // update_profile alongside the real answer, corrupting the saved profile. It
  // also occasionally produced tool_use → end_turn with no text, falling back
  // to the error response. Sonnet handles the multi-step instruction-following
  // reliably. Onboarding is only 4–5 turns per user lifetime so the cost delta
  // is negligible.
  const model = 'claude-sonnet-4-6'

  const toolNames = SUB_AGENT_TOOLS[agent]
  const tools = getToolsByNames(toolNames)

  // History window: onboarding needs full context for continuity across the 4-field
  // profile flow. Non-onboarding turns over-fetch — 12 recent messages is plenty
  // for sub-agent intents while keeping input tokens lean.
  const historyWindow = context.isOnboarding ? history : history.slice(-12)

  const messages: Anthropic.Messages.MessageParam[] = [
    ...historyWindow,
    { role: 'user', content: userMessage },
  ]

  const maxIterations = 12
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    const response = await claude.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0.8,
      system: [
        { type: 'text', text: staticPrefix, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicSuffix },
      ],
      tools: tools.length > 0 ? tools : undefined,
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === 'text',
      )
      return textBlocks.map((b) => b.text).join('\n') || FALLBACK_RESPONSE
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const input = block.input as Record<string, unknown>
        input.student_id = context.studentId
        if (!input.platform) input.platform = context.platform

        const result = await executeTool(block.name, input)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return FALLBACK_RESPONSE
}
