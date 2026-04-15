import { Router } from 'express'
import { config } from '../config.js'
import { parseIncomingXml, verifySignature, splitMessage } from './wechat-xml.js'
import { processMessage } from '../agent/george.js'
import { log } from '../observability/logger.js'
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
          '汪！👻 你居然能看到我？！我是George Tirebiter，USC最有名的幽灵狗🐕\n\n我在这个校园游荡了快80年了，没什么是我不知道的。\n\n想知道最近有什么好活动？发消息问我就行！',
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
      await sendResponse(msg.fromUser, response)
    } catch (err) {
      log('error', 'wechat_handler_error', { error: (err as Error).message })
    }
  })

  return router
}

export { sendResponse as sendWeChatMessage }
