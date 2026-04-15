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
  '这条我就不跟了。你真正想问的是啥？活动、选课、房源、找人？',
  '换马甲套不到我 —— 你想聊 USC 相关的正事，我在。',
  '不玩这种。回来聊正事 —— 你是哪个 major？在找啥？',
  '这不是我能帮的方向。你如果是要找活动 / 课 / 房 / 人，直接说。',
]
