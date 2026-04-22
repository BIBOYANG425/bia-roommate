// Thin Google Maps Platform client. One file covers Geocoding (here),
// Distance Matrix (Task 4), and Places Nearby (Phase 2). Two LRU caches
// keep costs flat within Google ToS (30-day max geocode, 1-hour API).
//
// Errors are thrown with a `code` field so callers can map to tool errors.
// Known codes: `geo_disabled`, `geo_unavailable`.
//
// Header last reviewed: 2026-04-21

import { LRUCache } from 'lru-cache'
import { log } from '../observability/logger.js'

const LA_BBOX = { south: 34.0, north: 34.35, west: -118.7, east: -118.0 }
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days (Google ToS cap)
const API_TTL_MS = 60 * 60 * 1000 // 1 hour
const TIMEOUT_MS = 3000

// Cache slots wrap the value so the `null` ("known miss") case still
// satisfies lru-cache's `V extends {}` constraint under TS 6.
type GeoCacheSlot = { coords: { lat: number; lng: number } | null }
const geocodeCache = new LRUCache<string, GeoCacheSlot>({
  max: 500,
  ttl: GEOCODE_TTL_MS,
})
const apiCache = new LRUCache<string, object>({ max: 1000, ttl: API_TTL_MS })

export class GeoError extends Error {
  constructor(
    public code: 'geo_disabled' | 'geo_unavailable',
    message: string,
  ) {
    super(message)
  }
}

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new GeoError('geo_disabled', 'GOOGLE_MAPS_API_KEY not set')
  return key
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.ok) return res
      if (res.status >= 500 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      if (res.status === 429 || res.status === 403) {
        log('warn', 'google_maps_billing_blocked', { status: res.status })
        throw new GeoError('geo_unavailable', `Google Maps ${res.status}`)
      }
      throw new GeoError('geo_unavailable', `Google Maps ${res.status}`)
    } catch (err) {
      if (err instanceof GeoError) throw err
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw new GeoError('geo_unavailable', (err as Error).message)
    }
  }
  throw new GeoError('geo_unavailable', 'exhausted retries')
}

export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = query.toLowerCase().trim()
  const hit = geocodeCache.get(cacheKey)
  if (hit) return hit.coords

  const key = requireKey()
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
  const res = await fetchWithRetry(url)
  const data = (await res.json()) as {
    status: string
    results: Array<{ geometry: { location: { lat: number; lng: number } } }>
  }
  if (data.status !== 'OK' || !data.results[0]) {
    geocodeCache.set(cacheKey, { coords: null }, { ttl: 24 * 60 * 60 * 1000 })
    return null
  }
  const { lat, lng } = data.results[0].geometry.location
  if (
    lat < LA_BBOX.south ||
    lat > LA_BBOX.north ||
    lng < LA_BBOX.west ||
    lng > LA_BBOX.east
  ) {
    geocodeCache.set(cacheKey, { coords: null }, { ttl: 24 * 60 * 60 * 1000 })
    return null
  }
  const loc = { lat, lng }
  geocodeCache.set(cacheKey, { coords: loc })
  return loc
}

type LatLng = { lat: number; lng: number }
type Mode = 'walking' | 'driving' | 'transit' | 'bicycling'
export type MatrixElement = { minutes: number; km: number } | null

function llKey(p: LatLng): string {
  return `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
}

export async function distanceMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  mode: Mode,
): Promise<MatrixElement[][]> {
  const cacheKey = `matrix|${mode}|${origins.map(llKey).join(';')}|${destinations.map(llKey).join(';')}`
  const cached = apiCache.get(cacheKey) as MatrixElement[][] | undefined
  if (cached) return cached

  const key = requireKey()
  const o = origins.map(llKey).join('|')
  const d = destinations.map(llKey).join('|')
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${o}&destinations=${d}&mode=${mode}&key=${key}`
  const res = await fetchWithRetry(url)
  const data = (await res.json()) as {
    status: string
    rows: Array<{
      elements: Array<{
        status: string
        duration?: { value: number }
        distance?: { value: number }
      }>
    }>
  }
  if (data.status !== 'OK') {
    throw new GeoError('geo_unavailable', `matrix status ${data.status}`)
  }

  const matrix: MatrixElement[][] = data.rows.map((row) =>
    row.elements.map((el) => {
      if (el.status !== 'OK' || !el.duration || !el.distance) return null
      return {
        minutes: Math.round(el.duration.value / 60),
        km: Math.round((el.distance.value / 1000) * 10) / 10,
      }
    }),
  )
  apiCache.set(cacheKey, matrix)
  return matrix
}

// Exported for Task 5 (rate limiter) and Phase 2 (placesNearby).
export const _internal = { apiCache, fetchWithRetry, requireKey, geocodeCache }
