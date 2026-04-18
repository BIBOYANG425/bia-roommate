/**
 * Split an agent response into multiple chat messages on blank-line boundaries.
 *
 * Background: a real WeChat / iMessage conversation reads as a burst of short
 * lines, not one paragraph. George's prompt tells the model to separate logical
 * beats with a blank line; this helper cashes those blank lines in at the
 * adapter layer so the receiving side sees N separate bubbles.
 *
 * Guardrails:
 *  - Trim each part; drop empties.
 *  - Cap at MAX_PARTS. If the model emits more, merge the tail into the last
 *    kept part so nothing is silently dropped.
 *  - Keep the source message order.
 *
 * Header last reviewed: 2026-04-18
 */

// Hard cap on parts per reply. Above this, WeChat / iMessage starts looking
// like spam and the user loses the thread. Merge the tail into the last part.
const MAX_PARTS = 4

export function splitIntoMessages(response: string): string[] {
  if (!response) return []
  const parts = response
    .split(/\n\s*\n/) // blank-line boundary (tolerates trailing whitespace)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) return []

  // Cap at MAX_PARTS; append the overflow to the last kept part on its own line.
  if (parts.length <= MAX_PARTS) return parts
  const kept = parts.slice(0, MAX_PARTS - 1)
  const tail = parts.slice(MAX_PARTS - 1).join('\n')
  kept.push(tail)
  return kept
}

// Inter-message delay that feels like typing, not a flood. 600ms is long
// enough for the recipient's client to render the prior bubble, short enough
// that conversation doesn't stall.
export const INTER_MESSAGE_DELAY_MS = 600

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
