import { describe, it, expect } from 'vitest'
import { parseIncomingXml, verifySignature, splitMessage } from '../../src/adapters/wechat-xml.js'

describe('WeChat XML helpers', () => {
  it('parses text message', async () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_test]]></ToUserName>
      <FromUserName><![CDATA[oUser123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[Hello George!]]></Content>
      <MsgId>123456</MsgId>
    </xml>`
    const msg = await parseIncomingXml(xml)
    expect(msg.fromUser).toBe('oUser123')
    expect(msg.msgType).toBe('text')
    expect(msg.content).toBe('Hello George!')
  })

  it('parses voice message', async () => {
    const xml = `<xml>
      <ToUserName><![CDATA[gh_test]]></ToUserName>
      <FromUserName><![CDATA[oUser123]]></FromUserName>
      <CreateTime>1348831860</CreateTime>
      <MsgType><![CDATA[voice]]></MsgType>
      <MsgId>123456</MsgId>
    </xml>`
    const msg = await parseIncomingXml(xml)
    expect(msg.msgType).toBe('voice')
  })

  it('verifies signature returns boolean', () => {
    const result = verifySignature('sig', '123', 'nonce', 'token')
    expect(typeof result).toBe('boolean')
  })

  it('splits long messages at sentence boundaries', () => {
    const short = 'Hello world'
    expect(splitMessage(short)).toEqual([short])

    const long = '这是第一句话。' + '这是第二句话。'.repeat(100)
    const parts = splitMessage(long)
    expect(parts.length).toBeGreaterThan(1)
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(600)
    }
  })
})
