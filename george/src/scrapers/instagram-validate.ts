// Pure validation of the lightweight-LLM output shape before it reaches the
// events table. Five rules: isEvent=true / title length 5-120 (after trim) /
// date parses and is within [now, now+180 days] / category coerced to a
// whitelist / input must be a non-null object. Description is also passed
// through stripContactInfo to remove phone numbers, Venmo handles, and email
// addresses (Bob 2026-05-03 design-spec amendment, in
// fix/geo-rate-limit-and-ig-spec, treats those as PII that should not surface
// in event cards).
//
// Header last reviewed: 2026-05-03

export const CATEGORIES = ['social', 'academic', 'career', 'cultural', 'sports', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

const TITLE_MIN = 5
const TITLE_MAX = 120
const FUTURE_WINDOW_DAYS = 180
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ValidEvent {
  title: string
  description: string | null
  date: string
  location: string | null
  category: Category
}

export type ValidationResult =
  | { valid: true; event: ValidEvent }
  | {
      valid: false
      reason: 'not_object' | 'not_event' | 'title_length' | 'date_invalid' | 'date_out_of_window'
    }

const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const VENMO_RE = /\b(?:venmo|@venmo)\s*[:@]?\s*[\w-]+/gi
const EMAIL_RE = /\b[\w.-]+@[\w-]+\.[\w.-]+\b/g
const REDACT = '[contact removed]'

export function stripContactInfo(input: string | null): string | null {
  if (input === null) return null
  return input
    .replace(EMAIL_RE, REDACT)
    .replace(PHONE_RE, REDACT)
    .replace(VENMO_RE, REDACT)
}

function coerceCategory(raw: unknown): Category {
  if (typeof raw !== 'string') return 'other'
  return (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : 'other'
}

function coerceString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function validatePost(input: unknown): ValidationResult {
  if (input === null || typeof input !== 'object') {
    return { valid: false, reason: 'not_object' }
  }
  const obj = input as Record<string, unknown>

  if (obj.isEvent !== true) {
    return { valid: false, reason: 'not_event' }
  }

  const title = obj.title
  if (typeof title !== 'string') {
    return { valid: false, reason: 'title_length' }
  }
  const trimmedLen = title.trim().length
  if (trimmedLen < TITLE_MIN || trimmedLen > TITLE_MAX) {
    return { valid: false, reason: 'title_length' }
  }

  if (typeof obj.date !== 'string') {
    return { valid: false, reason: 'date_invalid' }
  }
  const parsed = new Date(obj.date)
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, reason: 'date_invalid' }
  }

  const now = Date.now()
  const windowEnd = now + FUTURE_WINDOW_DAYS * MS_PER_DAY
  const ts = parsed.getTime()
  if (ts < now || ts > windowEnd) {
    return { valid: false, reason: 'date_out_of_window' }
  }

  return {
    valid: true,
    event: {
      title,
      description: stripContactInfo(coerceString(obj.description)),
      date: parsed.toISOString(),
      location: coerceString(obj.location),
      category: coerceCategory(obj.category),
    },
  }
}
