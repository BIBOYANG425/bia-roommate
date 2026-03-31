// Reads course bin from WebReg DOM
// Writes course codes to chrome.storage.session for the popup optimizer

export function readScheduleData() {
  const courseCodes: string[] = []

  // WebReg: course IDs are in span.crsID elements (e.g., "BUAD-100 x:", "CSCI-201:")
  const crsIdEls = document.querySelectorAll<HTMLElement>('.crsID')

  for (const el of crsIdEls) {
    const text = el.textContent?.trim() || ''
    // Match patterns like "BUAD-100", "CSCI-201", "BUAD-100 x:"
    const match = text.match(/([A-Z]{2,5})[-\s](\d{3}[A-Z]?)/)
    if (match) {
      const courseId = `${match[1]}-${match[2]}`
      if (!courseCodes.includes(courseId)) {
        courseCodes.push(courseId)
      }
    }
  }

  if (courseCodes.length === 0) return

  console.log(`[BIA] Found ${courseCodes.length} courses in bin:`, courseCodes)

  // Write to chrome.storage.session for popup access
  chrome.storage.session.set({
    courseCodes,
    lastUpdated: Date.now(),
  }).catch((err) => {
    console.warn('[BIA] Failed to write schedule data:', err)
  })
}
