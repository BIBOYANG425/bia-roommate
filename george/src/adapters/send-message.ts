export async function sendPlatformMessage(
  platform: 'wechat' | 'imessage',
  platformId: string,
  text: string,
) {
  if (platform === 'wechat') {
    const { sendWeChatMessage } = await import('./wechat.js')
    await sendWeChatMessage(platformId, text)
  } else {
    const { sendIMessage } = await import('./imessage.js')
    await sendIMessage(platformId, text)
  }
}
