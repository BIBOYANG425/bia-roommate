import { describe, it, expect } from 'vitest'
import {
  validatePost,
  stripContactInfo,
  CATEGORIES,
} from '../../src/scrapers/instagram-validate.js'

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

describe('validatePost', () => {
  describe('happy paths', () => {
    for (const category of CATEGORIES) {
      it(`accepts a valid ${category} event`, () => {
        const result = validatePost({
          isEvent: true,
          title: `Demo ${category} event`,
          description: 'desc',
          date: daysFromNow(7),
          location: 'Campus',
          category,
        })
        expect(result.valid).toBe(true)
        if (result.valid) {
          expect(result.event.title).toBe(`Demo ${category} event`)
          expect(result.event.category).toBe(category)
        }
      })
    }
  })

  describe('rejects', () => {
    const base = {
      isEvent: true,
      title: 'Valid title',
      description: 'd',
      date: daysFromNow(7),
      location: 'Campus',
      category: 'social',
    }

    it('rejects isEvent=false', () => {
      const r = validatePost({ ...base, isEvent: false })
      expect(r).toEqual({ valid: false, reason: 'not_event' })
    })

    it('rejects title shorter than 5 chars', () => {
      const r = validatePost({ ...base, title: 'abc' })
      expect(r).toEqual({ valid: false, reason: 'title_length' })
    })

    it('rejects title longer than 120 chars', () => {
      const r = validatePost({ ...base, title: 'x'.repeat(121) })
      expect(r).toEqual({ valid: false, reason: 'title_length' })
    })

    it('rejects whitespace-only title (trim before length check)', () => {
      const r = validatePost({ ...base, title: '       ' })
      expect(r).toEqual({ valid: false, reason: 'title_length' })
    })

    it('rejects null date', () => {
      const r = validatePost({ ...base, date: null })
      expect(r).toEqual({ valid: false, reason: 'date_invalid' })
    })

    it('rejects unparseable date string', () => {
      const r = validatePost({ ...base, date: 'not-a-date' })
      expect(r).toEqual({ valid: false, reason: 'date_invalid' })
    })

    it('rejects date in the past', () => {
      const r = validatePost({ ...base, date: daysFromNow(-1) })
      expect(r).toEqual({ valid: false, reason: 'date_out_of_window' })
    })

    it('rejects date more than 180 days out', () => {
      const r = validatePost({ ...base, date: daysFromNow(181) })
      expect(r).toEqual({ valid: false, reason: 'date_out_of_window' })
    })
  })

  describe('coercions (not rejects)', () => {
    it("coerces unknown category to 'other'", () => {
      const r = validatePost({
        isEvent: true,
        title: 'Valid title',
        date: daysFromNow(7),
        category: 'wildcategory',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.category).toBe('other')
    })

    it("treats missing category as 'other'", () => {
      const r = validatePost({
        isEvent: true,
        title: 'Valid title',
        date: daysFromNow(7),
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.category).toBe('other')
    })
  })

  describe('null-guard', () => {
    it('rejects null', () => {
      expect(validatePost(null)).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects undefined', () => {
      expect(validatePost(undefined)).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects a string', () => {
      expect(validatePost('nope')).toEqual({ valid: false, reason: 'not_object' })
    })
    it('rejects a number', () => {
      expect(validatePost(42)).toEqual({ valid: false, reason: 'not_object' })
    })
  })

  describe('PII strip on description (Bob 2026-05-03 spec amendment)', () => {
    it('strips phone numbers from description', () => {
      const r = validatePost({
        isEvent: true,
        title: 'Spring Formal',
        description: 'Hit me up at 213-555-0199 for tickets',
        date: daysFromNow(7),
        category: 'social',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.description).not.toMatch(/213/)
    })

    it('strips Venmo handles from description', () => {
      const r = validatePost({
        isEvent: true,
        title: 'Mixer',
        description: 'Pay via Venmo @uscphidelt or @sparksc-treasurer',
        date: daysFromNow(7),
        category: 'social',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.description?.toLowerCase()).not.toMatch(/venmo/)
    })

    it('strips emails from description', () => {
      const r = validatePost({
        isEvent: true,
        title: 'Recruiting Mixer',
        description: 'RSVP to recruiting@uscphidelt.org by Friday',
        date: daysFromNow(7),
        category: 'social',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.description).not.toMatch(/@uscphidelt\.org/)
    })

    it('strips a combination in one description', () => {
      const desc = 'Text 949.555.0123, Venmo @captain, email captain@usc.edu'
      const r = validatePost({
        isEvent: true,
        title: 'Beach Day',
        description: desc,
        date: daysFromNow(7),
        category: 'social',
      })
      expect(r.valid).toBe(true)
      if (r.valid) {
        expect(r.event.description).not.toMatch(/949/)
        expect(r.event.description?.toLowerCase()).not.toMatch(/venmo/)
        expect(r.event.description).not.toMatch(/@usc\.edu/)
      }
    })

    it('leaves descriptions without PII unchanged', () => {
      const r = validatePost({
        isEvent: true,
        title: 'Lunch & Learn',
        description: 'Free pizza at noon. Bring a friend.',
        date: daysFromNow(7),
        category: 'academic',
      })
      expect(r.valid).toBe(true)
      if (r.valid) expect(r.event.description).toBe('Free pizza at noon. Bring a friend.')
    })
  })
})

describe('stripContactInfo', () => {
  it('returns null on null input', () => {
    expect(stripContactInfo(null)).toBeNull()
  })

  it('returns input unchanged when nothing matches', () => {
    expect(stripContactInfo('hello world')).toBe('hello world')
  })

  it('strips a 10-digit phone with dashes', () => {
    expect(stripContactInfo('call 213-555-0199 now')).not.toMatch(/213/)
  })

  it('strips a 10-digit phone with dots', () => {
    expect(stripContactInfo('call 213.555.0199 now')).not.toMatch(/213/)
  })

  it('strips a 10-digit phone with spaces', () => {
    expect(stripContactInfo('call 213 555 0199 now')).not.toMatch(/213/)
  })
})
