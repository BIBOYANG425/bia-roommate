import { config } from '../config.js'
import { processMessage } from '../agent/george.js'
import { log } from '../observability/logger.js'
import type { IncomingMessage } from './types.js'

/** Minimal surface of @photon-ai/advanced-imessage-kit (optional runtime dep, no bundled types). */
interface IMessageSDK {
  connect(): Promise<void>
  on(
    event: 'new-message',
    handler: (message: {
      text: string
      chatGuid: string
      isFromMe: boolean
      handle: string
    }) => void | Promise<void>,
  ): void
  chats: {
    startTyping(chatGuid: string): Promise<void>
    stopTyping(chatGuid: string): Promise<void>
  }
  messages: {
    sendMessage(opts: { chatGuid: string; message: string }): Promise<void>
  }
}

let sdk: IMessageSDK | null = null

export async function startIMessageAdapter() {
  if (!config.imessage.apiKey) {
    log('warn', 'imessage_skip', { reason: 'No IMESSAGE_API_KEY configured' })
    return
  }

  try {
    // @ts-expect-error — package not installed; runtime-only dependency
    const { SDK } = await import('@photon-ai/advanced-imessage-kit')
    const client: IMessageSDK = SDK({
      serverUrl: config.imessage.serverUrl,
      apiKey: config.imessage.apiKey,
      logLevel: 'info',
    })
    sdk = client

    await client.connect()
    log('info', 'imessage_connected', { server: config.imessage.serverUrl })

    client.on('new-message', async (message: {
      text: string
      chatGuid: string
      isFromMe: boolean
      handle: string
    }) => {
      if (message.isFromMe) return

      const incoming: IncomingMessage = {
        userId: message.handle || message.chatGuid,
        platform: 'imessage',
        text: message.text,
        msgType: 'text',
        timestamp: Date.now(),
      }

      try {
        await client.chats.startTyping(message.chatGuid)
        const response = await processMessage(incoming)
        await client.chats.stopTyping(message.chatGuid)
        await client.messages.sendMessage({ chatGuid: message.chatGuid, message: response })
      } catch (err) {
        log('error', 'imessage_error', { error: (err as Error).message })
        await client.chats.stopTyping(message.chatGuid).catch(() => {})
        await client.messages.sendMessage({
          chatGuid: message.chatGuid,
          message: '哎呀，我穿墙的时候卡住了...再试一次？👻',
        })
      }
    })
  } catch (err) {
    log('warn', 'imessage_sdk_unavailable', { error: (err as Error).message })
  }
}

export async function sendIMessage(chatGuid: string, text: string) {
  if (!sdk) throw new Error('iMessage SDK not connected')
  await sdk.messages.sendMessage({ chatGuid, message: text })
}
