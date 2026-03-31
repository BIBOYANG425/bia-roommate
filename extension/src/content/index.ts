import { injectRmpBadges } from './rmp-injector'
import { injectSeatBadges } from './seat-counter'
import { readScheduleData } from './schedule-reader'
import { highlightConflicts, clearConflictHighlights } from './conflict-highlighter'
import type { ExtensionSettings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

type Site = 'webreg' | 'classes' | 'unknown'

function detectSite(): Site {
  const host = window.location.hostname
  if (host.includes('webreg.usc.edu')) return 'webreg'
  if (host.includes('classes.usc.edu')) return 'classes'
  return 'unknown'
}

async function getSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.local.get('settings')
    return { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Cleanup functions for removing injected decorations
function removeRmpBadges() {
  const badges = document.querySelectorAll('.bia-rmp-badge, .bia-rmp-badge-loading')
  for (const b of badges) b.remove()
  const processed = document.querySelectorAll('[data-bia-rmp]')
  for (const el of processed) el.removeAttribute('data-bia-rmp')
}

function removeSeatBadges() {
  const badges = document.querySelectorAll('.bia-seat-badge, .bia-seat-summary')
  for (const b of badges) b.remove()
  const processed = document.querySelectorAll('[data-bia-seats]')
  for (const el of processed) el.removeAttribute('data-bia-seats')
  const headerProcessed = document.querySelectorAll('[data-bia-seats-summary]')
  for (const el of headerProcessed) el.removeAttribute('data-bia-seats-summary')
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isProcessing = false
let pendingProcess = false

function debounce(fn: () => void, ms: number) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

async function processPage(site: Site) {
  if (isProcessing) {
    pendingProcess = true
    return
  }
  isProcessing = true

  try {
    const settings = await getSettings()

    // Both sites: RMP badges
    try {
      if (settings.showRmpRatings) {
        await injectRmpBadges(site)
      } else {
        removeRmpBadges()
      }
    } catch (err) {
      console.warn('[BIA] RMP badge error:', err)
    }

    // Both sites: seat count badges
    try {
      if (settings.showSeatCounts) {
        injectSeatBadges(site)
      } else {
        removeSeatBadges()
      }
    } catch (err) {
      console.warn('[BIA] Seat badge error:', err)
    }

    // WebReg only: schedule reader + conflict highlighter
    if (site === 'webreg') {
      try {
        readScheduleData()
      } catch (err) {
        console.warn('[BIA] Schedule reader error:', err)
      }
      try {
        if (settings.highlightConflicts) {
          highlightConflicts()
        } else {
          clearConflictHighlights()
        }
      } catch (err) {
        console.warn('[BIA] Conflict highlighter error:', err)
      }
    }
  } catch (err) {
    console.warn('[BIA] Error loading settings:', err)
  } finally {
    isProcessing = false
    if (pendingProcess) {
      pendingProcess = false
      debounce(() => processPage(site), 100)
    }
  }
}

function init() {
  const site = detectSite()
  if (site === 'unknown') return

  console.log(`[BIA Course Helper] Loaded on ${site}`)

  // classes.usc.edu renders content via JavaScript (Angular SPA).
  // Wait for any meaningful content to appear before first injection.
  let waitAttempts = 0
  function waitForContent() {
    waitAttempts++

    // Check for WebReg section rows, course containers, tables, or Angular content
    const hasContent = document.querySelector(
      '.section_crsbin, .section-table, .course-header, .accordion-content-area, .content-wrapper-courses, table'
    ) !== null

    if (!hasContent && waitAttempts < 20) {
      // Retry — content hasn't rendered yet (max 10 seconds)
      setTimeout(waitForContent, 500)
      return
    }

    if (!hasContent) {
      console.log('[BIA] No course content found after 10s, setting up observer only')
    }

    // Process the page
    processPage(site)

    // Watch for DOM changes (Angular route navigation, expanding sections, etc.)
    const observer = new MutationObserver((mutations) => {
      // Ignore mutations caused by our own badge injections
      const isOwnMutation = mutations.every((m) => {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement && (
            node.classList.contains('bia-rmp-badge') ||
            node.classList.contains('bia-rmp-badge-loading') ||
            node.classList.contains('bia-seat-badge') ||
            node.classList.contains('bia-seat-summary') ||
            node.classList.contains('bia-conflict-highlight')
          )) continue
          return false
        }
        for (const node of m.removedNodes) {
          if (node instanceof HTMLElement && (
            node.classList.contains('bia-rmp-badge') ||
            node.classList.contains('bia-rmp-badge-loading') ||
            node.classList.contains('bia-seat-badge') ||
            node.classList.contains('bia-seat-summary')
          )) continue
          return false
        }
        return true
      })
      if (isOwnMutation) return
      debounce(() => processPage(site), 300)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  // Start watching — small delay to let initial JS execute
  if (document.readyState === 'complete') {
    setTimeout(waitForContent, 300)
  } else {
    window.addEventListener('load', () => setTimeout(waitForContent, 300))
  }

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      processPage(site)
    }
  })
}

// Check for login page — if redirected, stop injecting
const isLoginPage = document.querySelector('#loginForm, .shib-login, [action*="login"]') !== null
if (isLoginPage) {
  console.log('[BIA] Login page detected, skipping injection')
} else {
  init()
}
