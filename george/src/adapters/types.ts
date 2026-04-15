export interface IncomingMessage {
  userId: string
  platform: 'wechat' | 'imessage'
  text: string
  msgType?: 'text' | 'voice' | 'image' | 'video' | 'location' | 'link' | 'sticker'
  timestamp: number
}

export interface OutgoingMessage {
  userId: string
  platform: 'wechat' | 'imessage'
  text: string
}
