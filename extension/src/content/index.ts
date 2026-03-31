import { injectRmpBadges } from './rmp-injector'
import { injectSeatBadges } from './seat-counter'
import { readScheduleData } from './schedule-reader'
import { highlightConflicts } from './conflict-highlighter'
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
    return result.settings ?? DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isProcessing = false

function debounce(fn: () => void, ms: number) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

async function processPage(site: Site) {
  if (isProcessing) return
  isProcessing = true

  try {
    const settings = await getSettings()

    // Both sites: RMP badges
    if (settings.showRmpRatings) {
      await injectRmpBadges(site)
    }

    // Both sites: seat count badges
    if (settings.showSeatCounts) {
      injectSeatBadges(site)
    }

    // WebReg only: schedule reader + conflict highlighter
    if (site === 'webreg') {
      readScheduleData()
      if (settings.highlightConflicts) {
        highlightConflicts()
      }
    }
  } catch (err) {
    console.warn('[BIA] Error processing page:', err)
  } finally {
    isProcessing = false
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
    const observer = new MutationObserver(() => {
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
