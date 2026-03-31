import type { RmpRating } from '../shared/types'
import { getRmpColor } from '../shared/constants'

const PROCESSED_ATTR = 'data-bia-rmp'
const BATCH_SIZE = 50

function normalizeInstructorName(raw: string): string | null {
  const cleaned = raw
    .replace(/\(Primary\)/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned === 'Staff' || cleaned === 'TBA' || cleaned === 'TBD' || cleaned.length < 3) return null

  // "Last, First" → "First Last"  (WebReg format)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((s) => s.trim())
    if (parts.length === 2 && !parts[0].includes(' ') && !parts[1].includes(' ')) {
      return `${parts[1]} ${parts[0]}`
    }
    return cleaned
  }

  // Already "First Last" format — must have at least 2 words
  if (cleaned.split(' ').length >= 2) return cleaned

  return null
}

// Extract text from a section_row span, excluding the hidden mobile label
function getCellText(el: HTMLElement): string {
  let text = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node instanceof HTMLElement) {
      // Skip hidden mobile labels and any BIA badges
      if (node.classList.contains('table-headers-xsmall')) continue
      if (node.className.startsWith('bia-')) continue
      text += node.textContent
    }
  }
  return text.trim()
}

// Find instructor cells in WebReg's div-based layout
function findInstructorCellsWebReg(): { el: HTMLElement; names: string[] }[] {
  const results: { el: HTMLElement; names: string[] }[] = []

  const allCells = document.querySelectorAll<HTMLElement>('.section_crsbin > .section_row')

  for (const cell of allCells) {
    const label = cell.querySelector('.table-headers-xsmall')
    if (!label) continue
    const labelText = label.textContent?.trim().toLowerCase() || ''
    if (!labelText.startsWith('instructor')) continue

    if (cell.hasAttribute(PROCESSED_ATTR)) continue

    const text = getCellText(cell)
    if (!text) continue

    // WebReg uses "Last, First" format — split only by newline, not comma
    const rawNames = text.split(/\n/).map((n) => n.trim()).filter(Boolean)
    const names: string[] = []
    for (const raw of rawNames) {
      const name = normalizeInstructorName(raw)
      if (name) names.push(name)
    }

    if (names.length > 0) {
      results.push({ el: cell, names })
    }
  }

  return results
}

// Fallback: find instructor cells in HTML table layout (classes.usc.edu)
function findInstructorCellsTable(): { el: HTMLElement; names: string[] }[] {
  const results: { el: HTMLElement; names: string[] }[] = []
  const tables = document.querySelectorAll<HTMLTableElement>('table')

  for (const table of tables) {
    const headerRow = table.querySelector('tr')
    if (!headerRow) continue

    const headers = headerRow.querySelectorAll('th, td')
    let colIdx = -1
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].textContent?.trim().toLowerCase() || ''
      if (text === 'instructor' || text === 'instructors') {
        colIdx = i
        break
      }
    }
    if (colIdx === -1) continue

    const rows = table.querySelectorAll('tr')
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll('td')
      if (colIdx >= cells.length) continue

      const cell = cells[colIdx] as HTMLElement
      if (cell.hasAttribute(PROCESSED_ATTR)) continue

      const text = cell.textContent?.trim() || ''
      if (!text) continue

      const rawNames = text.split(/[\n]/).map((n) => n.trim()).filter(Boolean)
      const names: string[] = []
      for (const raw of rawNames) {
        const name = normalizeInstructorName(raw)
        if (name) names.push(name)
      }

      if (names.length > 0) {
        results.push({ el: cell, names })
      }
    }
  }

  return results
}

function findInstructorCells(_site: string): { el: HTMLElement; names: string[] }[] {
  // Try WebReg div-based layout first
  const webregResults = findInstructorCellsWebReg()
  if (webregResults.length > 0) return webregResults

  // Fallback to table-based layout
  return findInstructorCellsTable()
}

function createBadge(rating: RmpRating | null, name: string): HTMLElement {
  const badge = document.createElement('a')
  badge.className = 'bia-rmp-badge'

  if (rating) {
    const color = getRmpColor(rating.avgRating)
    badge.style.backgroundColor = color
    badge.textContent = `${rating.avgRating.toFixed(1)} ★`
    badge.title = `${name}\nRating: ${rating.avgRating}/5 (${rating.numRatings} reviews)\nDifficulty: ${rating.avgDifficulty}/5`
    badge.href = `https://www.ratemyprofessors.com/professor/${rating.legacyId}`
  } else {
    badge.style.backgroundColor = getRmpColor(null)
    badge.textContent = 'N/A'
    badge.title = `${name}\nNo RateMyProfessors data found`
    badge.href = `https://www.ratemyprofessors.com/search/professors/1381?q=${encodeURIComponent(name)}`
  }

  badge.target = '_blank'
  badge.rel = 'noopener noreferrer'
  badge.addEventListener('click', (e) => e.stopPropagation())

  return badge
}

function createLoadingBadge(): HTMLElement {
  const badge = document.createElement('span')
  badge.className = 'bia-rmp-badge bia-rmp-badge-loading'
  badge.textContent = '...'
  return badge
}

export async function injectRmpBadges(_site: string) {
  const elements = findInstructorCells(_site)
  if (elements.length === 0) return

  // Collect all unique names and map them to elements
  const nameToElements = new Map<string, HTMLElement[]>()

  for (const { el, names } of elements) {
    el.setAttribute(PROCESSED_ATTR, 'true')

    for (const name of names) {
      const loading = createLoadingBadge()
      el.appendChild(loading)

      const existing = nameToElements.get(name)
      if (existing) {
        existing.push(el)
      } else {
        nameToElements.set(name, [el])
      }
    }
  }

  // Batch names and send to background worker
  const allNames = Array.from(nameToElements.keys())

  for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
    const batch = allNames.slice(i, i + BATCH_SIZE)

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RMP_BATCH',
        names: batch,
      })

      if (response?.type === 'RMP_BATCH_RESULT') {
        for (const name of batch) {
          const rating = response.ratings[name] ?? null
          const els = nameToElements.get(name) || []

          for (const el of els) {
            // Remove loading badges
            const loadingBadges = el.querySelectorAll('.bia-rmp-badge-loading')
            for (const lb of loadingBadges) lb.remove()

            el.appendChild(createBadge(rating, name))
          }
        }
      }
    } catch (err) {
      console.warn('[BIA] RMP batch request failed:', err)
      for (const name of batch) {
        const els = nameToElements.get(name) || []
        for (const el of els) {
          // Remove loading badges and clear processed attr so retries work
          const loadingBadges = el.querySelectorAll('.bia-rmp-badge-loading')
          for (const lb of loadingBadges) lb.remove()
          el.removeAttribute(PROCESSED_ATTR)
        }
      }
    }
  }
}
