import { describe, it, expect } from 'vitest'
import { resolveAlias, ALIASES } from '../../src/services/usc-aliases.js'

describe('resolveAlias', () => {
  it('resolves canonical exact match (case insensitive)', () => {
    expect(resolveAlias('Frat Row')).toMatchObject({
      canonical: 'Frat Row',
      neighborhood: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
    })
    expect(resolveAlias('frat row')).toMatchObject({ canonical: 'Frat Row' })
    expect(resolveAlias('FRAT ROW')).toMatchObject({ canonical: 'Frat Row' })
  })

  it('resolves variants', () => {
    expect(resolveAlias('28th st')?.canonical).toBe('Frat Row')
    expect(resolveAlias('28th street')?.canonical).toBe('Frat Row')
  })

  it('strips punctuation before lookup', () => {
    expect(resolveAlias('K-town')?.canonical).toBe('K-town')
    expect(resolveAlias('k town')?.canonical).toBe('K-town')
    expect(resolveAlias('ktown')?.canonical).toBe('K-town')
  })

  it('DMC and VKC and CPA all resolve to the same entry', () => {
    const dmc = resolveAlias('DMC')
    const vkc = resolveAlias('VKC')
    const cpa = resolveAlias('CPA')
    expect(dmc).not.toBeNull()
    expect(dmc?.canonical).toBe(vkc?.canonical)
    expect(dmc?.canonical).toBe(cpa?.canonical)
    expect(dmc?.lat).toBe(vkc?.lat)
  })

  it('returns null for unknown input', () => {
    expect(resolveAlias('Mars Rover Base')).toBeNull()
  })

  it('all alias entries have valid coords and non-empty variants', () => {
    // Sanity bbox covers greater LA + the SGV / OC suburbs USC students
    // commonly reference (Rowland Heights, Arcadia, Irvine). Deliberately
    // wider than the geocode-fallback bbox in the design doc (34.00-34.35
    // N, -118.70 to -118.00 W) — aliases are handpicked and trusted; the
    // geocode bbox only filters Google's fallback responses.
    expect(ALIASES.length).toBeGreaterThanOrEqual(35)
    for (const a of ALIASES) {
      expect(a.canonical).toBeTruthy()
      expect(a.variants.length).toBeGreaterThan(0)
      expect(a.lat).toBeGreaterThan(33.5) // SoCal south (covers OC)
      expect(a.lat).toBeLessThan(34.4) // SoCal north
      expect(a.lng).toBeGreaterThan(-118.8) // SoCal west
      expect(a.lng).toBeLessThan(-117.5) // SoCal east (covers SGV + OC)
    }
  })
})
