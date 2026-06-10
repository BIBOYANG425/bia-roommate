// Geo tools: travel_time (Phase 1) + find_places_near (Phase 2).
// All tool outputs are JSON-stringified for the agent. Errors surface as
// { error: ... } objects, never thrown.
//
// Header last reviewed: 2026-06-10

import { registerTool } from '../agent/tool-registry.js'
import { resolveAlias } from '../services/usc-aliases.js'
import {
  geocode,
  distanceMatrix,
  placesNearby,
  GeoError,
} from '../services/google-maps.js'
import type { PlaceType } from '../services/google-maps.js'
import { checkGeoBudget } from '../services/geo-rate-limit.js'

type Mode = 'walking' | 'driving' | 'transit' | 'bicycling'
const ALLOWED_MODES: readonly Mode[] = ['walking', 'driving', 'transit', 'bicycling'] as const
function isValidMode(m: string): m is Mode {
  return (ALLOWED_MODES as readonly string[]).includes(m)
}

type LatLng = { lat: number; lng: number }
type GeoToolError =
  | { error: 'need_location'; hint: string }
  | { error: 'geo_unavailable' }
  | { error: 'geo_disabled' }
  | { error: 'geo_budget_exceeded' }

// USC-internal acronyms like "MRF", "KAP", "JFF" geocode to random LA
// storefronts that happen to share letters. Fail closed before calling
// the geocoder — unknown USC acronyms belong in the alias table, not
// Google's index.
const SHORT_ACRONYM_RX = /^[a-z]{2,5}$/i

async function resolveOrigin(
  input: string,
): Promise<
  | LatLng
  | { error: 'need_location'; hint: string }
  | { error: 'geo_disabled' }
  | { error: 'geo_unavailable' }
> {
  const aliased = resolveAlias(input)
  if (aliased) return { lat: aliased.lat, lng: aliased.lng }

  const trimmed = input.trim()
  if (SHORT_ACRONYM_RX.test(trimmed)) {
    return {
      error: 'need_location',
      hint: `"${input}" looks like an unknown USC acronym, ask the student which building they mean`,
    }
  }

  try {
    const loc = await geocode(input)
    if (!loc) {
      return {
        error: 'need_location',
        hint: `could not place "${input}" on a map, ask the student to clarify`,
      }
    }
    return loc
  } catch (err) {
    if (err instanceof GeoError) return { error: err.code }
    return { error: 'geo_unavailable' }
  }
}

registerTool(
  'travel_time',
  'Compute travel time and distance between two locations. Use BEFORE claiming something is walkable from somewhere. Inputs: from, to (names like "Frat Row" or "K-town" or LA addresses), mode (walking/driving/transit/bicycling, default walking). Returns { minutes, km, walkable, mode } or an error object.',
  {
    properties: {
      from: { type: 'string', description: 'Origin name or address' },
      to: { type: 'string', description: 'Destination name or address' },
      mode: {
        type: 'string',
        description: 'Travel mode: walking (default) | driving | transit | bicycling',
      },
    },
    required: ['from', 'to'],
  },
  async (input) => {
    const from = String(input.from ?? '')
    const to = String(input.to ?? '')
    const rawMode = String(input.mode ?? 'walking').toLowerCase()
    const mode: Mode = isValidMode(rawMode) ? rawMode : 'walking'
    const studentId = String(input.student_id ?? '')

    if (!checkGeoBudget(studentId)) {
      return JSON.stringify({ error: 'geo_budget_exceeded' } satisfies GeoToolError)
    }

    const fromLoc = await resolveOrigin(from)
    if ('error' in fromLoc) return JSON.stringify(fromLoc)
    const toLoc = await resolveOrigin(to)
    if ('error' in toLoc) return JSON.stringify(toLoc)

    try {
      const matrix = await distanceMatrix([fromLoc], [toLoc], mode)
      const el = matrix[0]?.[0]
      if (!el) {
        return JSON.stringify({
          error: 'need_location',
          hint: 'route could not be computed between those points',
        })
      }
      return JSON.stringify({
        minutes: el.minutes,
        km: el.km,
        walkable: mode === 'walking' && el.minutes <= 20,
        mode,
      })
    } catch (err) {
      if (err instanceof GeoError) {
        return JSON.stringify({ error: err.code } satisfies GeoToolError)
      }
      return JSON.stringify({ error: 'geo_unavailable' } satisfies GeoToolError)
    }
  },
)

type Category =
  | 'food'
  | 'cafe'
  | 'grocery'
  | 'gym'
  | 'pharmacy'
  | 'library'
  | 'study_spot'

const CATEGORY_TO_PLACE_TYPE: Record<Category, PlaceType> = {
  food: 'restaurant',
  cafe: 'cafe',
  grocery: 'supermarket',
  gym: 'gym',
  pharmacy: 'pharmacy',
  library: 'library',
  study_spot: 'library', // close enough; filtered by Google's rating
}

const DEFAULT_RADIUS_KM: Record<Category, number> = {
  food: 0.5,
  cafe: 0.5,
  grocery: 1.0,
  gym: 1.0,
  pharmacy: 1.0,
  library: 1.0,
  study_spot: 1.0,
}

// Load-bearing for the cost envelope: every candidate kept here becomes one
// Distance Matrix destination. DO NOT raise without revisiting the design doc.
const NEARBY_CAP = 5

registerTool(
  'find_places_near',
  'Discover places near an origin, sorted by travel time. Inputs: origin (name or address), category (food/cafe/grocery/gym/pharmacy/library/study_spot), radius_km (default 0.5 for food/cafe, 1.0 otherwise, max 3), mode (walking default). Returns up to 5 places with travel time, or an error object.',
  {
    properties: {
      origin: { type: 'string', description: 'Origin name or address' },
      category: {
        type: 'string',
        description: 'food | cafe | grocery | gym | pharmacy | library | study_spot',
      },
      radius_km: {
        type: 'number',
        description: 'Search radius in km (default 0.5 for food/cafe, 1.0 otherwise, max 3)',
      },
      mode: { type: 'string', description: 'walking (default) | driving' },
    },
    required: ['origin', 'category'],
  },
  async (input) => {
    const origin = String(input.origin ?? '')
    const rawCategory = String(input.category ?? 'food')
    const category: Category =
      rawCategory in CATEGORY_TO_PLACE_TYPE ? (rawCategory as Category) : 'food'
    const rawMode = String(input.mode ?? 'walking').toLowerCase()
    const mode: 'walking' | 'driving' = rawMode === 'driving' ? 'driving' : 'walking'
    const studentId = String(input.student_id ?? '')
    const requestedRadius =
      typeof input.radius_km === 'number' ? input.radius_km : DEFAULT_RADIUS_KM[category]
    const radiusKm = Math.min(Math.max(requestedRadius, 0.1), 3)
    const radiusMeters = Math.round(radiusKm * 1000)

    if (!checkGeoBudget(studentId)) {
      return JSON.stringify({ error: 'geo_budget_exceeded' } satisfies GeoToolError)
    }

    const originLoc = await resolveOrigin(origin)
    if ('error' in originLoc) return JSON.stringify(originLoc)

    try {
      const nearby = await placesNearby(originLoc, CATEGORY_TO_PLACE_TYPE[category], radiusMeters)
      if (nearby.length === 0) return JSON.stringify([])

      // Cap candidates BEFORE the Distance Matrix call. Load-bearing for cost:
      // keep only the top NEARBY_CAP by Google rating, then price-walk those.
      const top = nearby
        .slice()
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, NEARBY_CAP)

      const matrix = await distanceMatrix(
        [originLoc],
        top.map((p) => ({ lat: p.lat, lng: p.lng })),
        mode,
      )
      const row = matrix[0] ?? []
      const enriched = top
        .map((p, i) => {
          const el = row[i]
          if (!el) return null
          return {
            name: p.name,
            google_rating: p.rating,
            travel_minutes: el.minutes,
            travel_km: el.km,
            travel_mode: mode,
            neighborhood: deriveNeighborhood(p.lat, p.lng),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      enriched.sort(
        (a, b) =>
          a.travel_minutes - b.travel_minutes ||
          (b.google_rating ?? 0) - (a.google_rating ?? 0),
      )
      return JSON.stringify(enriched)
    } catch (err) {
      if (err instanceof GeoError) {
        return JSON.stringify({ error: err.code } satisfies GeoToolError)
      }
      return JSON.stringify({ error: 'geo_unavailable' } satisfies GeoToolError)
    }
  },
)

// Cheap local neighborhood inference from coords. Good enough to help the agent
// say "Law School cafe in the Marshall area" vs "Trader Joe's in K-town".
function deriveNeighborhood(lat: number, lng: number): string {
  if (lat >= 34.018 && lat <= 34.027 && lng >= -118.295 && lng <= -118.275) return 'USC UPC'
  if (lat >= 34.05 && lat <= 34.08 && lng >= -118.32 && lng <= -118.28) return 'K-town'
  if (lat >= 34.03 && lat <= 34.07 && lng >= -118.27 && lng <= -118.22) return 'DTLA'
  if (lng >= -118.08 && lng <= -117.95) return '626 / SGV'
  return 'LA'
}
