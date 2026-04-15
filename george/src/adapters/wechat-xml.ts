import crypto from 'crypto'
import { parseStringPromise } from 'xml2js'

export interface WeChatMessage {
  toUser: string
  fromUser: string
  createTime: number
  msgType: string
  content?: string
  event?: string
  msgId?: string
}

export async function parseIncomingXml(xml: string): Promise<WeChatMessage> {
  const parsed = await parseStringPromise(xml, { explicitArray: false })
  const msg = parsed.xml
  return {
    toUser: msg.ToUserName,
    fromUser: msg.FromUserName,
    createTime: parseInt(msg.CreateTime),
    msgType: msg.MsgType,
    content: msg.Content,
    event: msg.Event,
    msgId: msg.MsgId,
  }
}

export function verifySignature(
  signature: string,
  timestamp: string,
  nonce: string,
  token: string,
): boolean {
  const hash = crypto
    .createHash('sha1')
    .update([token, timestamp, nonce].sort().join(''))
    .digest('hex')
  return hash === signature
}

export function splitMessage(text: string, maxLen = 600): string[] {
  if (text.length <= maxLen) return [text]
  const parts: string[] = []
  let remaining = text

  while (remaining.length > maxLen) {
    let splitIndex = -1
    const sentenceEnders = ['。', '！', '？', '!', '?', '.', '\n']
    for (let i = maxLen - 1; i >= maxLen / 2; i--) {
      if (sentenceEnders.includes(remaining[i])) {
        splitIndex = i + 1
        break
      }
    }
    if (splitIndex === -1) {
      const lastSpace = remaining.lastIndexOf(' ', maxLen)
      splitIndex = lastSpace > maxLen / 2 ? lastSpace + 1 : maxLen
    }
    parts.push(remaining.slice(0, splitIndex).trim())
    remaining = remaining.slice(splitIndex).trim()
  }
  if (remaining) parts.push(remaining)
  return parts
}
