// WeChat Official Account adapter. POST /wechat receives XML → signature verify →
// parse → dedup (60s window) → processMessage(). Access token cached with lazy refresh.
// processMessage() returns null when the filter drops third-party noise (meeting
// invites, OTPs, promo SMS); we silently skip the send in that case. Non-null
// responses are split on blank-line boundaries into up to 4 chat messages with
// INTER_MESSAGE_DELAY_MS between parts, matching WeChat's short-burst cadence.
// Subscribe events trigger the BIA welcome copy.
//
// Header last reviewed: 2026-04-18

import { Router } from 'express'
import { config } from '../config.js'
import { parseIncomingXml, verifySignature, splitMessage } from './wechat-xml.js'
import { processMessage } from '../agent/george.js'
import { log } from '../observability/logger.js'
import { splitIntoMessages, sleep, INTER_MESSAGE_DELAY_MS } from './split-response.js'
import type { IncomingMessage } from './types.js'

let cachedToken = { token: '', expiresAt: 0 }

async function getAccessToken(): Promise<string> {
  if (Date.now() < cachedToken.expiresAt) return cachedToken.token
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wechat.appId}&secret=${config.wechat.appSecret}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  const data = (await res.json()) as { access_token: string; expires_in: number }
  if (!data.access_token) {
    log('error', 'wechat_token_error', { response: data })
    throw new Error('Failed to get WeChat access token')
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
  return cachedToken.token
}

async function sendCustomerServiceMessage(openId: string, text: string) {
  const token = await getAccessToken()
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: openId,
        msgtype: 'text',
        text: { content: text },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    log('error', 'wechat_send_error', { openId, status: res.status, body: err })
  }
}

async function sendResponse(openId: string, text: string) {
  const parts = splitMessage(text)
  for (const part of parts) {
    await sendCustomerServiceMessage(openId, part)
    if (parts.length > 1) await new Promise((r) => setTimeout(r, 200))
  }
}

const processedMessages = new Map<string, number>()

setInterval(() => {
  const cutoff = Date.now() - 60_000
  for (const [key, time] of processedMessages) {
    if (time < cutoff) processedMessages.delete(key)
  }
}, 30_000)

function isDuplicate(msgId: string): boolean {
  if (processedMessages.has(msgId)) return true
  processedMessages.set(msgId, Date.now())
  return false
}

export function createWeChatRouter(): Router {
  const router = Router()

  router.get('/wechat', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query as Record<string, string>
    if (verifySignature(signature, timestamp, nonce, config.wechat.token)) {
      res.send(echostr)
    } else {
      res.status(403).send('Invalid signature')
    }
  })

  router.post('/wechat', async (req, res) => {
    const { signature, timestamp, nonce } = req.query as Record<string, string>
    if (!verifySignature(signature, timestamp, nonce, config.wechat.token)) {
      return res.status(403).send('Invalid signature')
    }

    try {
      const msg = await parseIncomingXml(req.body as string)

      if (msg.msgType === 'event' && msg.event === 'subscribe') {
        res.send('success')
        await sendCustomerServiceMessage(
          msg.fromUser,
          '我是 George，BIA (Bridging Internationals Association) 的 AI 伙伴 —— 3,500+ USC 国际学生社群。\n\n找活动、选课、sublet、认识人、campus 攻略都可以问我。直接发消息就行。',
        )
        return
      }

      if (msg.msgId && isDuplicate(msg.msgId)) {
        return res.send('success')
      }

      res.send('success')

      const msgType = (['text', 'voice', 'image', 'video', 'location'].includes(msg.msgType)
        ? msg.msgType
        : 'sticker') as IncomingMessage['msgType']

      const incoming: IncomingMessage = {
        userId: msg.fromUser,
        platform: 'wechat',
        text: msg.content || '',
        msgType,
        timestamp: msg.createTime,
      }

      const response = await processMessage(incoming)
      // null response = filtered (automated-message / meeting-invite noise).
      // Silently drop; no reply back to the sender.
      if (response !== null) {
        const parts = splitIntoMessages(response)
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) await sleep(INTER_MESSAGE_DELAY_MS)
          await sendResponse(msg.fromUser, parts[i])
        }
      }
    } catch (err) {
      log('error', 'wechat_handler_error', { error: (err as Error).message })
    }
  })

  return router
}

export { sendResponse as sendWeChatMessage }
