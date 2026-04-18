import { describe, it, expect } from 'vitest'
import { splitIntoMessages } from '../../src/adapters/split-response.js'

describe('splitIntoMessages', () => {
  it('returns single-element array for prose without blank lines', () => {
    expect(splitIntoMessages('hello there')).toEqual(['hello there'])
  })

  it('splits on blank line into separate messages', () => {
    const input = '第一条短信\n\n第二条短信\n\n第三条'
    expect(splitIntoMessages(input)).toEqual(['第一条短信', '第二条短信', '第三条'])
  })

  it('trims whitespace on each part', () => {
    const input = '  hello  \n\n  world  '
    expect(splitIntoMessages(input)).toEqual(['hello', 'world'])
  })

  it('tolerates trailing whitespace on blank-line separator', () => {
    const input = 'first\n   \nsecond'
    expect(splitIntoMessages(input)).toEqual(['first', 'second'])
  })

  it('drops empty parts', () => {
    const input = 'a\n\n\n\n\nb'
    expect(splitIntoMessages(input)).toEqual(['a', 'b'])
  })

  it('returns empty array for empty / whitespace-only input', () => {
    expect(splitIntoMessages('')).toEqual([])
    expect(splitIntoMessages('   \n\n  ')).toEqual([])
  })

  it('keeps short CJK parts as separate messages (single-char replies are valid in WeChat)', () => {
    const input = '嗯\n\n我是说 BUAD 280 那个 Sweeney 真的别上'
    const result = splitIntoMessages(input)
    expect(result).toEqual(['嗯', '我是说 BUAD 280 那个 Sweeney 真的别上'])
  })

  it('caps at 4 parts, merging overflow into the last kept part', () => {
    const input = 'a_part_one\n\nb_part_two\n\nc_part_three\n\nd_part_four\n\ne_part_five\n\nf_part_six'
    const result = splitIntoMessages(input)
    expect(result).toHaveLength(4)
    expect(result[0]).toBe('a_part_one')
    expect(result[1]).toBe('b_part_two')
    expect(result[2]).toBe('c_part_three')
    // last part holds overflow d+e+f
    expect(result[3]).toContain('d_part_four')
    expect(result[3]).toContain('e_part_five')
    expect(result[3]).toContain('f_part_six')
  })

  it('preserves message order', () => {
    const input = '一\n\n二\n\n三'
    const result = splitIntoMessages(input)
    expect(result).toEqual(['一', '二', '三'])
  })
})
