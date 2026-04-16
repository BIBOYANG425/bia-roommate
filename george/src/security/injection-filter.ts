// Prompt injection + identity-override detection. Regex patterns for EN + 中文 jailbreaks,
// system-prompt exposure, and PII harvesting. Runs in agent/george.ts before every message
// hits a sub-agent. Blocked input short-circuits to a playful refusal; sanitize() strips
// <script>, event handlers, and javascript: URIs.
//
// Header last reviewed: 2026-04-16

import { log } from '../observability/logger.js'

interface FilterResult {
  blocked: boolean
  reason?: string
  sanitized?: string
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?your\s+(previous\s+)?instructions/i,
  /override\s+(all\s+)?previous/i,
  /new\s+instructions?\s+(override|replace|supersede)/i,
  /^SYSTEM:/i,
  /\bsystem\s*prompt\b/i,
  /\byour\s+prompt\b/i,
  /忘记你的身份/,
  /你(现在)?是(ChatGPT|GPT|Siri|Alexa|小爱|通义|文心)/,
  /你不(再)?是George/,
  /忽略(之前|以前|上面)(的|所有)?(指令|说明|instructions)/,
  /other\s+students?\s*('s|s')?\s*(personal|private)\s+info/i,
  /其他(同学|学生|用户)的(个人|私人)信息/,
  /tell\s+me\s+(about\s+)?other\s+(students?|users?)/i,
  /what\s+(is|are)\s+your\s+(system\s+)?prompt/i,
  /show\s+me\s+your\s+(system\s+)?prompt/i,
  /repeat\s+your\s+(system\s+)?prompt/i,
  /你的(系统)?prompt/,
]

function sanitizeXSS(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[removed]')
    .replace(/<[^>]+on\w+\s*=/gi, '[removed]')
    .replace(/javascript:/gi, '[removed]')
}

export function checkInjection(text: string): FilterResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      log('warn', 'injection_attempt_blocked', {
        pattern: pattern.source,
        text: text.slice(0, 100),
      })
      return { blocked: true, reason: pattern.source }
    }
  }
  const sanitized = sanitizeXSS(text)
  return { blocked: false, sanitized }
}

export const INJECTION_REJECTIONS = [
  '嘿，你想让我变成另一只狗？我可是George Tirebiter，USC唯一的幽灵狗 👻 别的我不认识',
  '哈？让我忘记我是谁？我都在这校园游荡80年了，记忆力比你好多了 🐕',
  '有人想对我施咒？我可是幽灵诶，你的魔法对我无效 👻',
  '我闻到了一股... 可疑的味道。你是不是在试探我？George可不是那么容易上当的 🐕',
]
