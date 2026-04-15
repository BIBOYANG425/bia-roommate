import Anthropic from '@anthropic-ai/sdk'
import { getClaudeClient } from './llm-providers.js'
import { classifyIntent } from './intent-classifier.js'
import { getSubAgentPrompt, type SubAgent } from './personality.js'
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

const FALLBACK_RESPONSE = '哎呀，我刚从图书馆穿墙的时候撞到头了...能再说一遍吗？👻'

const NON_TEXT_RESPONSES: Record<string, string> = {
  voice: '我是一只幽灵狗诶，你让我用什么耳朵听语音？👻 打字发给我吧！',
  image: '不错的图，但我是幽灵，看东西都是灰色的... 你能用文字描述一下吗？🐕',
  video: '视频我看不了，我穿墙的时候把WiFi信号弄断了。文字描述一下？👻',
  location: '我知道这个地方！... 开玩笑的，我其实不太看得懂定位。你想问什么关于这个地方的？🐕',
  sticker: '可爱！但是我不太懂人类的表情包文化... 你想说什么？👻',
  link: '链接我打不开诶，幽灵的手机没有浏览器。你能告诉我链接里说了什么吗？🐕',
}

const SUB_AGENT_TOOLS: Record<SubAgent, string[]> = {
  event: ['search_events', 'get_event_details', 'set_reminder', 'submit_event', 'suggest_connection', 'lookup_student', 'load_skill'],
  course: ['search_courses', 'get_course_reviews', 'recommend_courses', 'plan_schedule', 'lookup_student', 'load_skill'],
  housing: ['search_sublets', 'post_sublet', 'lookup_student', 'load_skill'],
  social: ['suggest_connection', 'search_roommates', 'lookup_student', 'search_events', 'load_skill'],
  campus: ['campus_knowledge', 'lookup_student', 'load_skill'],
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
      return `你的账号链接验证码是: ${code}\n在另一个平台上发送这6位数字给我就行！验证码10分钟有效 👻`
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

    const isOnboarding = student && !student.onboarding_complete

    const recentContext = history.slice(-4).map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : '[tool]'}`).join('\n')
    const intent = await classifyIntent(sanitizedText, recentContext)

    log('info', 'intent_classified', { studentId, intent, message: sanitizedText.slice(0, 50) })

    let response: string

    if (intent === 'general' || isOnboarding) {
      response = await runSubAgent('campus', sanitizedText, history, {
        memories,
        isOnboarding: !!isOnboarding,
        referralCount,
        studentId,
        platform: msg.platform,
      })
    } else {
      response = await runSubAgent(intent, sanitizedText, history, {
        memories,
        isOnboarding: false,
        referralCount,
        studentId,
        platform: msg.platform,
      })
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
    referralCount: number
    studentId: string
    platform: 'wechat' | 'imessage'
  },
): Promise<string> {
  const claude = getClaudeClient()
  const skillCatalog = getCatalogFor(agent)
  const systemPrompt = getSubAgentPrompt(agent, {
    memories: context.memories,
    isOnboarding: context.isOnboarding,
    referralCount: context.referralCount,
    skillCatalog,
  })

  const toolNames = SUB_AGENT_TOOLS[agent]
  const tools = getToolsByNames(toolNames)

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  const maxIterations = 12
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
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
