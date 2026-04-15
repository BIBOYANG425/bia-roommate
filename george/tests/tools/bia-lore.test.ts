import { describe, it, expect } from 'vitest'
import {
  ANTI_PATTERNS,
  checkAntiPatterns,
  countEmoji,
  voiceLint,
  USC_LOCATIONS_ZH,
  HOUSING_NEIGHBORHOODS,
  SIGNATURE_PHRASES,
  PAIN_POINTS,
} from '../../src/agent/bia-lore.js'

describe('bia-lore constants', () => {
  it('exports non-empty USC locations block with at least Doheny + Leavey + Tommy Trojan', () => {
    expect(USC_LOCATIONS_ZH).toContain('Doheny')
    expect(USC_LOCATIONS_ZH).toContain('Leavey')
    expect(USC_LOCATIONS_ZH).toContain('Tommy Trojan')
  })

  it('includes the four canonical neighborhoods with price bands', () => {
    expect(HOUSING_NEIGHBORHOODS).toContain('University Park')
    expect(HOUSING_NEIGHBORHOODS).toContain('Koreatown')
    expect(HOUSING_NEIGHBORHOODS).toContain('DTLA')
    expect(HOUSING_NEIGHBORHOODS).toContain('Arcadia')
    expect(HOUSING_NEIGHBORHOODS).toMatch(/\$\d{3}/)
  })

  it('includes signature BIA taglines', () => {
    expect(SIGNATURE_PHRASES).toContain('别让室友变室敌')
    expect(SIGNATURE_PHRASES).toContain('聊得来 ≠ 住得来')
  })

  it('pain points cover the critical roommate conflict categories', () => {
    expect(PAIN_POINTS).toContain('作息')
    expect(PAIN_POINTS).toContain('整洁')
    expect(PAIN_POINTS).toContain('噪音')
    expect(PAIN_POINTS).toContain('押金')
  })
})

describe('ANTI_PATTERNS detection', () => {
  it('flags "As an AI" in assistant output', () => {
    const hits = checkAntiPatterns('As an AI assistant, I can help with that.')
    expect(hits.find((h) => h.id === 'as_an_ai')).toBeDefined()
  })

  it('flags "作为一个 AI"', () => {
    const hits = checkAntiPatterns('作为一个 AI，我只能提供参考意见')
    expect(hits.find((h) => h.id === 'as_an_ai_zh')).toBeDefined()
  })

  it('flags "希望对你有帮助" closer', () => {
    const hits = checkAntiPatterns('这门课很难。希望对你有帮助。')
    expect(hits.find((h) => h.id === 'hope_helpful_zh')).toBeDefined()
  })

  it('flags ghost-dog residue phrases', () => {
    const sniffHits = checkAntiPatterns('让我嗅嗅有什么好活动')
    expect(sniffHits.find((h) => h.id === 'ghost_sniff')).toBeDefined()

    const wallHits = checkAntiPatterns('我刚从 Doheny 穿墙过来')
    expect(wallHits.find((h) => h.id === 'ghost_wall')).toBeDefined()

    const loreHits = checkAntiPatterns('我 1940 年就在这儿')
    expect(loreHits.find((h) => h.id === 'ghost_1940')).toBeDefined()
  })

  it('flags "I hope this helps" closer', () => {
    const hits = checkAntiPatterns('Here are some options. I hope this helps!')
    expect(hits.find((h) => h.id === 'i_hope_this_helps')).toBeDefined()
  })

  it('flags empty 加油 closers', () => {
    const hits = checkAntiPatterns('这门课不难\n加油！')
    expect(hits.find((h) => h.id === 'empty_jiayou')).toBeDefined()
  })

  it('leaves authentic BIA-voice replies untouched (no false positives)', () => {
    const authentic = 'K-town $700-1000 方便但夜里 Uber 贵，别住 6th 南边。你预算多少？'
    const hits = checkAntiPatterns(authentic)
    expect(hits).toEqual([])
  })
})

describe('countEmoji', () => {
  it('counts common emojis', () => {
    expect(countEmoji('不错 🐕 但是 👻')).toBe(2)
    expect(countEmoji('🚩 Red Flag #1')).toBe(1)
    expect(countEmoji('没有表情')).toBe(0)
  })
})

describe('voiceLint', () => {
  it('passes clean BIA-style replies', () => {
    const clean = 'K-town 性价比最高，H Mart 近、24h 便利店。但夜里 Uber 贵，晚归记得 UPC 早一点回。'
    const result = voiceLint(clean)
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
  })

  it('flags over-length replies', () => {
    const long = 'a'.repeat(700)
    const result = voiceLint(long, { maxLen: 600 })
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.startsWith('length:'))).toBe(true)
  })

  it('flags emoji overload', () => {
    const emojiStorm = '好活动 🎉🎊🎈🎁✨'
    const result = voiceLint(emojiStorm)
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.startsWith('emoji:'))).toBe(true)
  })

  it('flags AI-slop phrases', () => {
    const slop = 'Of course! I hope this helps!'
    const result = voiceLint(slop)
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.includes('i_hope_this_helps'))).toBe(true)
  })

  it('can downgrade ghost-dog residue to warning (pre-PR-3 transitional mode)', () => {
    const ghostly = '让我嗅嗅有啥活动'
    const fatal = voiceLint(ghostly, { ghostResidueFatal: true })
    expect(fatal.ok).toBe(false)

    const lenient = voiceLint(ghostly, { ghostResidueFatal: false })
    expect(lenient.ok).toBe(true)
  })

  it('ANTI_PATTERNS list is non-trivially populated', () => {
    expect(ANTI_PATTERNS.length).toBeGreaterThanOrEqual(20)
    for (const ap of ANTI_PATTERNS) {
      expect(ap.id).toBeTruthy()
      expect(ap.rx).toBeInstanceOf(RegExp)
      expect(ap.reason).toBeTruthy()
    }
  })
})
