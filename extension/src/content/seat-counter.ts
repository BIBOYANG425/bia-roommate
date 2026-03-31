const PROCESSED_ATTR = 'data-bia-seats'
const HEADER_PROCESSED_ATTR = 'data-bia-seats-summary'

const SEAT_PATTERN = /(\d+)\s*(?:of|\/)\s*(\d+)/

function createSeatBadge(registered: number, capacity: number): HTMLElement {
  const badge = document.createElement('span')
  const isFull = registered >= capacity
  badge.className = `bia-seat-badge ${isFull ? 'bia-seat-badge-full' : 'bia-seat-badge-open'}`
  badge.textContent = isFull ? 'FULL' : `${capacity - registered} open`
  badge.title = `${registered}/${capacity} registered${isFull ? ' — section is full' : ''}`
  return badge
}

function createCourseSummaryBadge(totalOpen: number, totalCapacity: number, sectionCount: number): HTMLElement {
  const badge = document.createElement('span')
  const allFull = totalOpen === 0
  badge.className = `bia-seat-summary ${allFull ? 'bia-seat-badge-full' : 'bia-seat-badge-open'}`
  badge.textContent = allFull ? 'ALL FULL' : `${totalOpen} open`
  badge.title = `${totalCapacity - totalOpen}/${totalCapacity} total across ${sectionCount} section${sectionCount !== 1 ? 's' : ''}`
  return badge
}

function processSeatCell(cell: HTMLElement) {
  if (cell.hasAttribute(PROCESSED_ATTR)) return

  const text = cell.textContent?.trim() || ''
  const match = text.match(SEAT_PATTERN)
  if (match) {
    const registered = parseInt(match[1], 10)
    const capacity = parseInt(match[2], 10)
    if (!isNaN(registered) && !isNaN(capacity) && capacity > 0) {
      cell.setAttribute(PROCESSED_ATTR, 'true')
      cell.appendChild(createSeatBadge(registered, capacity))
    }
  }
}

// Add summary badge to each course header showing total open seats
function injectCourseSummaries() {
  const courseHeaders = document.querySelectorAll<HTMLElement>('.course-header')

  for (const header of courseHeaders) {
    if (header.hasAttribute(HEADER_PROCESSED_ATTR)) continue

    // Find the associated accordion content area (next sibling or by href)
    const targetId = header.getAttribute('href') || header.querySelector('a')?.getAttribute('href')
    if (!targetId) continue

    const contentArea = document.querySelector<HTMLElement>(targetId)
    if (!contentArea) continue

    // Find all registered cells in this course's sections
    const sectionCells = contentArea.querySelectorAll<HTMLElement>('.section_crsbin > .section_row')
    let totalOpen = 0
    let totalCapacity = 0
    let sectionCount = 0

    for (const cell of sectionCells) {
      const label = cell.querySelector('.table-headers-xsmall')
      if (!label) continue
      const labelText = label.textContent?.trim().toLowerCase() || ''
      if (!labelText.startsWith('registered')) continue

      const text = cell.textContent?.trim() || ''
      const match = text.match(SEAT_PATTERN)
      if (match) {
        const registered = parseInt(match[1], 10)
        const capacity = parseInt(match[2], 10)
        if (!isNaN(registered) && !isNaN(capacity) && capacity > 0) {
          totalOpen += (capacity - registered)
          totalCapacity += capacity
          sectionCount++
        }
      }
    }

    if (sectionCount > 0) {
      header.setAttribute(HEADER_PROCESSED_ATTR, 'true')
      // Append summary badge next to the course title
      const titleEl = header.querySelector('.crsTitl') || header.querySelector('a')
      if (titleEl) {
        titleEl.appendChild(createCourseSummaryBadge(totalOpen, totalCapacity, sectionCount))
      }
    }
  }
}

export function injectSeatBadges(_site: string) {
  // Strategy 1: WebReg div-based layout
  const allCells = document.querySelectorAll<HTMLElement>('.section_crsbin > .section_row')
  let found = false

  for (const cell of allCells) {
    const label = cell.querySelector('.table-headers-xsmall')
    if (!label) continue
    const labelText = label.textContent?.trim().toLowerCase() || ''
    if (!labelText.startsWith('registered')) continue

    found = true
    processSeatCell(cell)
  }

  // Add summary badges to course headers
  if (found) {
    injectCourseSummaries()
    return
  }

  // Strategy 2: HTML table layout (fallback)
  const tables = document.querySelectorAll<HTMLTableElement>('table')
  for (const table of tables) {
    const headerRow = table.querySelector('tr')
    if (!headerRow) continue

    const headers = headerRow.querySelectorAll('th, td')
    let colIdx = -1
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].textContent?.trim().toLowerCase() || ''
      if (text === 'registered' || text.includes('seats') || text.includes('enroll')) {
        colIdx = i
        break
      }
    }
    if (colIdx === -1) continue

    const rows = table.querySelectorAll('tr')
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll('td')
      if (colIdx >= cells.length) continue
      processSeatCell(cells[colIdx] as HTMLElement)
    }
  }
}
