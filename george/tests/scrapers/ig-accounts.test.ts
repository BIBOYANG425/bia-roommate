import { describe, it, expect } from 'vitest'
import { IG_ACCOUNTS, flattenHandles } from '../../src/scrapers/ig-accounts.js'

describe('IG_ACCOUNTS', () => {
  it('exposes three groups: frats, troyLabs, sep', () => {
    expect(Object.keys(IG_ACCOUNTS).sort()).toEqual(['frats', 'sep', 'troyLabs'])
  })

  it('every handle is a non-empty lowercase string with no @ prefix', () => {
    const all = flattenHandles()
    expect(all.length).toBeGreaterThan(0)
    for (const h of all) {
      expect(h).toMatch(/^[a-z0-9._]+$/)
      expect(h.startsWith('@')).toBe(false)
    }
  })

  it('no duplicate handles across groups', () => {
    const all = flattenHandles()
    expect(new Set(all).size).toBe(all.length)
  })
})
