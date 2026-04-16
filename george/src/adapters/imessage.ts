// iMessage adapter (macOS only, via @photon-ai/imessage-kit). startIMessageAdapter()
// opens a watcher that forwards direct messages into processMessage(). Requires Full Disk
// Access + signed-in iMessage on the host. If the SDK fails to init, logs a warning and
// continues — WeChat-only mode still works.
//
// Header last reviewed: 2026-04-16

import { IMessageSDK } from '@photon-ai/imessage-kit'
import { config } from '../config.js'
import { processMessage } from '../agent/george.js'
import { log } from '../observability/logger.js'
import type { IncomingMessage } from './types.js'

let sdk: IMessageSDK | null = null

export async function startIMessageAdapter() {
  if (!config.imessage.enabled) {
    log('warn', 'imessage_skip', { reason: 'IMESSAGE_ENABLED not set' })
    return
  }
  if (process.platform !== 'darwin') {
    log('warn', 'imessage_skip', { reason: `unsupported platform ${process.platform} — macOS only` })
    return
  }

  try {
    sdk = new IMessageSDK()

    await sdk.startWatching({
      onDirectMessage: async (msg) => {
        if (msg.isFromMe) return
        if (msg.isReaction) return
        if (!msg.text || !msg.sender) return

        const incoming: IncomingMessage = {
          userId: msg.sender, // phone or email — stored as students.imessage_id
          platform: 'imessage',
          text: msg.text,
          msgType: 'text',
          timestamp: msg.date.getTime(),
        }

        try {
          const response = await processMessage(incoming)
          await sdk!.send(msg.sender, response)
        } catch (err) {
          log('error', 'imessage_error', { error: (err as Error).message })
          await sdk!
            .send(msg.sender, '哎呀，我穿墙的时候卡住了...再试一次？👻')
            .catch(() => {})
        }
      },
      onError: (err: Error) => {
        log('error', 'imessage_watch_error', { error: err.message })
      },
    })

    log('info', 'imessage_connected', {})
  } catch (err) {
    log('warn', 'imessage_sdk_unavailable', { error: (err as Error).message })
    sdk = null
  }
}

export async function sendIMessage(recipient: string, text: string) {
  if (!sdk) throw new Error('iMessage SDK not connected')
  await sdk.send(recipient, text)
}

export async function stopIMessageAdapter() {
  if (sdk) {
    await sdk.close()
    sdk = null
  }
}
