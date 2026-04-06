(function () {
  'use strict';

  const RMP_BADGE_COLORS = {
    great: "#4CAF50",
    // 4.0 – 5.0
    average: "#FFC107",
    // 3.0 – 3.9
    below: "#FF9800",
    // 2.0 – 2.9
    poor: "#F44336",
    // 0.0 – 1.9
    none: "#9E9E9E"
    // No data
  };
  function getRmpColor(rating) {
    if (rating === null) return RMP_BADGE_COLORS.none;
    if (rating >= 4) return RMP_BADGE_COLORS.great;
    if (rating >= 3) return RMP_BADGE_COLORS.average;
    if (rating >= 2) return RMP_BADGE_COLORS.below;
    return RMP_BADGE_COLORS.poor;
  }

  const PROCESSED_ATTR$1 = "data-bia-rmp";
  const BATCH_SIZE = 50;
  function normalizeInstructorName(raw) {
    const cleaned = raw.replace(/\(Primary\)/gi, "").replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned === "Staff" || cleaned === "TBA" || cleaned === "TBD" || cleaned.length < 3) return null;
    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map((s) => s.trim());
      if (parts.length === 2 && !parts[0].includes(" ") && !parts[1].includes(" ")) {
        return `${parts[1]} ${parts[0]}`;
      }
      return cleaned;
    }
    if (cleaned.split(" ").length >= 2) return cleaned;
    return null;
  }
  function getCellText$1(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node instanceof HTMLElement) {
        if (node.classList.contains("table-headers-xsmall")) continue;
        if (node.className.startsWith("bia-")) continue;
        text += node.textContent;
      }
    }
    return text.trim();
  }
  function findInstructorCellsWebReg() {
    const results = [];
    const allCells = document.querySelectorAll(".section_crsbin > .section_row");
    for (const cell of allCells) {
      const label = cell.querySelector(".table-headers-xsmall");
      if (!label) continue;
      const labelText = label.textContent?.trim().toLowerCase() || "";
      if (!labelText.startsWith("instructor")) continue;
      if (cell.hasAttribute(PROCESSED_ATTR$1)) continue;
      const text = getCellText$1(cell);
      if (!text) continue;
      const rawNames = text.split(/\n/).map((n) => n.trim()).filter(Boolean);
      const names = [];
      for (const raw of rawNames) {
        const name = normalizeInstructorName(raw);
        if (name) names.push(name);
      }
      if (names.length > 0) {
        results.push({ el: cell, names });
      }
    }
    return results;
  }
  function findInstructorCellsTable() {
    const results = [];
    const tables = document.querySelectorAll("table");
    for (const table of tables) {
      const headerRow = table.querySelector("tr");
      if (!headerRow) continue;
      const headers = headerRow.querySelectorAll("th, td");
      let colIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        const text = headers[i].textContent?.trim().toLowerCase() || "";
        if (text === "instructor" || text === "instructors") {
          colIdx = i;
          break;
        }
      }
      if (colIdx === -1) continue;
      const rows = table.querySelectorAll("tr");
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (colIdx >= cells.length) continue;
        const cell = cells[colIdx];
        if (cell.hasAttribute(PROCESSED_ATTR$1)) continue;
        const text = cell.textContent?.trim() || "";
        if (!text) continue;
        const rawNames = text.split(/[\n]/).map((n) => n.trim()).filter(Boolean);
        const names = [];
        for (const raw of rawNames) {
          const name = normalizeInstructorName(raw);
          if (name) names.push(name);
        }
        if (names.length > 0) {
          results.push({ el: cell, names });
        }
      }
    }
    return results;
  }
  function findInstructorCells(_site) {
    const webregResults = findInstructorCellsWebReg();
    if (webregResults.length > 0) return webregResults;
    return findInstructorCellsTable();
  }
  function createBadge(rating, name) {
    const badge = document.createElement("a");
    badge.className = "bia-rmp-badge";
    if (rating) {
      const color = getRmpColor(rating.avgRating);
      badge.style.backgroundColor = color;
      badge.textContent = `${rating.avgRating.toFixed(1)} ★`;
      badge.title = `${name}
Rating: ${rating.avgRating}/5 (${rating.numRatings} reviews)
Difficulty: ${rating.avgDifficulty}/5`;
      badge.href = `https://www.ratemyprofessors.com/professor/${rating.legacyId}`;
    } else {
      badge.style.backgroundColor = getRmpColor(null);
      badge.textContent = "N/A";
      badge.title = `${name}
No RateMyProfessors data found`;
      badge.href = `https://www.ratemyprofessors.com/search/professors/1381?q=${encodeURIComponent(name)}`;
    }
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.addEventListener("click", (e) => e.stopPropagation());
    return badge;
  }
  function createLoadingBadge() {
    const badge = document.createElement("span");
    badge.className = "bia-rmp-badge bia-rmp-badge-loading";
    badge.textContent = "...";
    return badge;
  }
  async function injectRmpBadges(_site) {
    const elements = findInstructorCells();
    if (elements.length === 0) return;
    const nameToElements = /* @__PURE__ */ new Map();
    for (const { el, names } of elements) {
      el.setAttribute(PROCESSED_ATTR$1, "true");
      for (const name of names) {
        const loading = createLoadingBadge();
        el.appendChild(loading);
        const existing = nameToElements.get(name);
        if (existing) {
          existing.push(el);
        } else {
          nameToElements.set(name, [el]);
        }
      }
    }
    const allNames = Array.from(nameToElements.keys());
    for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
      const batch = allNames.slice(i, i + BATCH_SIZE);
      try {
        const response = await chrome.runtime.sendMessage({
          type: "RMP_BATCH",
          names: batch
        });
        if (response?.type === "RMP_BATCH_RESULT") {
          for (const name of batch) {
            const rating = response.ratings[name] ?? null;
            const els = nameToElements.get(name) || [];
            for (const el of els) {
              const loadingBadges = el.querySelectorAll(".bia-rmp-badge-loading");
              for (const lb of loadingBadges) lb.remove();
              el.appendChild(createBadge(rating, name));
            }
          }
        }
      } catch (err) {
        console.warn("[BIA] RMP batch request failed:", err);
        for (const name of batch) {
          const els = nameToElements.get(name) || [];
          for (const el of els) {
            const loadingBadges = el.querySelectorAll(".bia-rmp-badge-loading");
            for (const lb of loadingBadges) lb.remove();
            el.removeAttribute(PROCESSED_ATTR$1);
          }
        }
      }
    }
  }

  const PROCESSED_ATTR = "data-bia-seats";
  const HEADER_PROCESSED_ATTR = "data-bia-seats-summary";
  const SEAT_PATTERN = /(\d+)\s*(?:of|\/)\s*(\d+)/;
  function createSeatBadge(registered, capacity) {
    const badge = document.createElement("span");
    const open = Math.max(0, capacity - registered);
    const overCapacity = Math.max(0, registered - capacity);
    if (overCapacity > 0) {
      badge.className = "bia-seat-badge bia-seat-badge-full";
      badge.textContent = `OVER +${overCapacity}`;
      badge.title = `${registered}/${capacity} registered — over capacity by ${overCapacity}`;
    } else if (open === 0) {
      badge.className = "bia-seat-badge bia-seat-badge-full";
      badge.textContent = "FULL";
      badge.title = `${registered}/${capacity} registered — section is full`;
    } else {
      badge.className = "bia-seat-badge bia-seat-badge-open";
      badge.textContent = `${open} open`;
      badge.title = `${registered}/${capacity} registered`;
    }
    return badge;
  }
  function createCourseSummaryBadge(totalOpen, totalCapacity, sectionCount) {
    const badge = document.createElement("span");
    const visibleOpen = Math.max(0, totalOpen);
    const totalRegistered = totalCapacity - totalOpen;
    if (visibleOpen === 0) {
      badge.className = `bia-seat-summary bia-seat-badge-full`;
      badge.textContent = "ALL FULL";
    } else {
      badge.className = `bia-seat-summary bia-seat-badge-open`;
      badge.textContent = `${visibleOpen} open`;
    }
    badge.title = `${totalRegistered}/${totalCapacity} total across ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`;
    return badge;
  }
  function processSeatCell(cell) {
    if (cell.hasAttribute(PROCESSED_ATTR)) return;
    const text = cell.textContent?.trim() || "";
    const match = text.match(SEAT_PATTERN);
    if (match) {
      const registered = parseInt(match[1], 10);
      const capacity = parseInt(match[2], 10);
      if (!isNaN(registered) && !isNaN(capacity) && capacity > 0) {
        cell.setAttribute(PROCESSED_ATTR, "true");
        cell.appendChild(createSeatBadge(registered, capacity));
      }
    }
  }
  function injectCourseSummaries() {
    const courseHeaders = document.querySelectorAll(".course-header");
    for (const header of courseHeaders) {
      if (header.hasAttribute(HEADER_PROCESSED_ATTR)) continue;
      const targetId = header.getAttribute("href") || header.querySelector("a")?.getAttribute("href");
      if (!targetId) continue;
      const contentArea = document.querySelector(targetId);
      if (!contentArea) continue;
      const sectionCells = contentArea.querySelectorAll(".section_crsbin > .section_row");
      let totalOpen = 0;
      let totalCapacity = 0;
      let sectionCount = 0;
      for (const cell of sectionCells) {
        const label = cell.querySelector(".table-headers-xsmall");
        if (!label) continue;
        const labelText = label.textContent?.trim().toLowerCase() || "";
        if (!labelText.startsWith("registered")) continue;
        const text = cell.textContent?.trim() || "";
        const match = text.match(SEAT_PATTERN);
        if (match) {
          const registered = parseInt(match[1], 10);
          const capacity = parseInt(match[2], 10);
          if (!isNaN(registered) && !isNaN(capacity) && capacity > 0) {
            totalOpen += capacity - registered;
            totalCapacity += capacity;
            sectionCount++;
          }
        }
      }
      if (sectionCount > 0) {
        header.setAttribute(HEADER_PROCESSED_ATTR, "true");
        const titleEl = header.querySelector(".crsTitl") || header.querySelector("a");
        if (titleEl) {
          titleEl.appendChild(createCourseSummaryBadge(totalOpen, totalCapacity, sectionCount));
        }
      }
    }
  }
  function injectSeatBadges(_site) {
    const allCells = document.querySelectorAll(".section_crsbin > .section_row");
    let found = false;
    for (const cell of allCells) {
      const label = cell.querySelector(".table-headers-xsmall");
      if (!label) continue;
      const labelText = label.textContent?.trim().toLowerCase() || "";
      if (!labelText.startsWith("registered")) continue;
      found = true;
      processSeatCell(cell);
    }
    if (found) {
      injectCourseSummaries();
      return;
    }
    const tables = document.querySelectorAll("table");
    for (const table of tables) {
      const headerRow = table.querySelector("tr");
      if (!headerRow) continue;
      const headers = headerRow.querySelectorAll("th, td");
      let colIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        const text = headers[i].textContent?.trim().toLowerCase() || "";
        if (text === "registered" || text.includes("seats") || text.includes("enroll")) {
          colIdx = i;
          break;
        }
      }
      if (colIdx === -1) continue;
      const rows = table.querySelectorAll("tr");
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (colIdx >= cells.length) continue;
        processSeatCell(cells[colIdx]);
      }
    }
  }

  function readScheduleData() {
    const courseCodesSet = /* @__PURE__ */ new Set();
    const crsIdEls = document.querySelectorAll(".crsID");
    for (const el of crsIdEls) {
      const text = el.textContent?.trim() || "";
      const match = text.match(/([A-Z]{2,5})[-\s](\d{3}[A-Z]?)/);
      if (match) {
        courseCodesSet.add(`${match[1]}-${match[2]}`);
      }
    }
    const courseCodes = Array.from(courseCodesSet);
    if (courseCodes.length === 0) {
      chrome.storage.session.set({ courseCodes: [], lastUpdated: Date.now() }).catch(() => {
      });
      return;
    }
    console.log(`[BIA] Found ${courseCodes.length} courses in bin:`, courseCodes);
    chrome.storage.session.set({
      courseCodes,
      lastUpdated: Date.now()
    }).catch((err) => {
      console.warn("[BIA] Failed to write schedule data:", err);
    });
  }

  const CONFLICT_ATTR = "data-bia-conflict";
  function getCellText(cell) {
    const clone = cell.cloneNode(true);
    const labels = clone.querySelectorAll(".table-headers-xsmall");
    for (const label of labels) label.remove();
    return clone.textContent?.trim() || "";
  }
  function parseTimeRange(timeStr) {
    const match = timeStr.match(
      /(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i
    );
    if (!match) return null;
    let startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    let endH = parseInt(match[4], 10);
    const endM = parseInt(match[5], 10);
    const endAmPm = (match[6] || match[3] || "").toLowerCase();
    if (endAmPm === "pm" && endH < 12) endH += 12;
    if (endAmPm === "pm" && startH < 12 && startH + 12 <= endH) startH += 12;
    return { startMin: startH * 60 + startM, endMin: endH * 60 + endM };
  }
  const DAY_MAP = { M: "Mon", T: "Tue", W: "Wed", H: "Thu", F: "Fri" };
  function parseDays(dayStr) {
    const days = [];
    for (const char of dayStr.toUpperCase()) {
      const mapped = DAY_MAP[char];
      if (mapped) days.push(mapped);
    }
    return days;
  }
  function buildCourseMap() {
    const map = /* @__PURE__ */ new Map();
    const courseHeaders = document.querySelectorAll(".course-header");
    for (const header of courseHeaders) {
      const crsIdEl = header.querySelector(".crsID");
      const text = crsIdEl?.textContent?.trim() || "";
      const match = text.match(/([A-Z]{2,5})[-\s](\d{3}[A-Z]?)/);
      if (!match) continue;
      const courseId = `${match[1]}-${match[2]}`;
      const targetId = header.getAttribute("href") || header.querySelector("a")?.getAttribute("href");
      if (!targetId) continue;
      const cleanId = targetId.replace(/^#/, "");
      const contentArea = document.getElementById(cleanId);
      if (contentArea) {
        map.set(contentArea, courseId);
      }
    }
    return map;
  }
  function findCourseId(el, courseMap) {
    let current = el;
    while (current) {
      if (courseMap.has(current)) return courseMap.get(current);
      current = current.parentElement;
    }
    return null;
  }
  function extractSectionSlots(sectionEl) {
    const cells = sectionEl.querySelectorAll(".section_row");
    let timeText = "";
    let dayText = "";
    for (const cell of cells) {
      const label = cell.querySelector(".table-headers-xsmall");
      if (!label) continue;
      const labelText = label.textContent?.trim().toLowerCase() || "";
      const cellText = getCellText(cell);
      if (labelText.includes("time")) timeText = cellText;
      if (labelText.includes("day")) dayText = cellText;
    }
    if (!dayText && timeText) {
      const dayMatch = timeText.match(/[MTWHF]+/i);
      if (dayMatch) dayText = dayMatch[0];
    }
    if (!timeText || !dayText) return [];
    if (dayText.toUpperCase() === "TBA" || timeText.toUpperCase() === "TBA") return [];
    const time = parseTimeRange(timeText);
    if (!time) return [];
    return parseDays(dayText).map((day) => ({ day, ...time }));
  }
  function slotsConflict(a, b) {
    return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
  }
  function clearConflictHighlights() {
    const highlighted = document.querySelectorAll(".bia-conflict-highlight");
    for (const el of highlighted) {
      el.classList.remove("bia-conflict-highlight");
      el.removeAttribute(CONFLICT_ATTR);
      el.title = "";
    }
  }
  function highlightConflicts() {
    clearConflictHighlights();
    const courseMap = buildCourseMap();
    if (courseMap.size === 0) return;
    const sections = [];
    const sectionEls = document.querySelectorAll(".section_crsbin");
    for (const sectionEl of sectionEls) {
      const courseId = findCourseId(sectionEl, courseMap);
      if (!courseId) continue;
      const slots = extractSectionSlots(sectionEl);
      if (slots.length === 0) continue;
      sections.push({ element: sectionEl, courseId, slots });
    }
    if (sections.length < 2) return;
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        if (sections[i].courseId === sections[j].courseId) continue;
        const hasConflict = sections[i].slots.some(
          (a) => sections[j].slots.some((b) => slotsConflict(a, b))
        );
        if (hasConflict) {
          for (const [el, conflictId] of [
            [sections[i].element, sections[j].courseId],
            [sections[j].element, sections[i].courseId]
          ]) {
            el.classList.add("bia-conflict-highlight");
            el.setAttribute(CONFLICT_ATTR, "true");
            const existing = el.title;
            if (!existing) {
              el.title = `Time conflict with ${conflictId}`;
            } else if (!existing.includes(conflictId)) {
              el.title = `${existing}, ${conflictId}`;
            }
          }
        }
      }
    }
    const storedSlots = sections.map((s) => ({
      courseId: s.courseId,
      slots: s.slots
    }));
    chrome.storage.session.set({ enrolledSlots: storedSlots }).catch(() => {
    });
  }

  const DEFAULT_SETTINGS = {
    showRmpRatings: true,
    highlightConflicts: true,
    showSeatCounts: true,
    semester: "20263"
  };

  function detectSite() {
    const host = window.location.hostname;
    if (host.includes("webreg.usc.edu")) return "webreg";
    if (host.includes("classes.usc.edu")) return "classes";
    return "unknown";
  }
  async function getSettings() {
    try {
      const result = await chrome.storage.local.get("settings");
      return { ...DEFAULT_SETTINGS, ...result.settings ?? {} };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  function removeRmpBadges() {
    const badges = document.querySelectorAll(".bia-rmp-badge, .bia-rmp-badge-loading");
    for (const b of badges) b.remove();
    const processed = document.querySelectorAll("[data-bia-rmp]");
    for (const el of processed) el.removeAttribute("data-bia-rmp");
  }
  function removeSeatBadges() {
    const badges = document.querySelectorAll(".bia-seat-badge, .bia-seat-summary");
    for (const b of badges) b.remove();
    const processed = document.querySelectorAll("[data-bia-seats]");
    for (const el of processed) el.removeAttribute("data-bia-seats");
    const headerProcessed = document.querySelectorAll("[data-bia-seats-summary]");
    for (const el of headerProcessed) el.removeAttribute("data-bia-seats-summary");
  }
  let debounceTimer = null;
  let isProcessing = false;
  let pendingProcess = false;
  function debounce(fn, ms) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, ms);
  }
  async function processPage(site) {
    if (isProcessing) {
      pendingProcess = true;
      return;
    }
    isProcessing = true;
    try {
      const settings = await getSettings();
      try {
        if (settings.showRmpRatings) {
          await injectRmpBadges(site);
        } else {
          removeRmpBadges();
        }
      } catch (err) {
        console.warn("[BIA] RMP badge error:", err);
      }
      try {
        if (settings.showSeatCounts) {
          injectSeatBadges(site);
        } else {
          removeSeatBadges();
        }
      } catch (err) {
        console.warn("[BIA] Seat badge error:", err);
      }
      if (site === "webreg") {
        try {
          readScheduleData();
        } catch (err) {
          console.warn("[BIA] Schedule reader error:", err);
        }
        try {
          if (settings.highlightConflicts) {
            highlightConflicts();
          } else {
            clearConflictHighlights();
          }
        } catch (err) {
          console.warn("[BIA] Conflict highlighter error:", err);
        }
      }
    } catch (err) {
      console.warn("[BIA] Error loading settings:", err);
    } finally {
      isProcessing = false;
      if (pendingProcess) {
        pendingProcess = false;
        debounce(() => processPage(site), 100);
      }
    }
  }
  function init() {
    const site = detectSite();
    if (site === "unknown") return;
    console.log(`[BIA Course Helper] Loaded on ${site}`);
    let waitAttempts = 0;
    function waitForContent() {
      waitAttempts++;
      const hasContent = document.querySelector(
        ".section_crsbin, .section-table, .course-header, .accordion-content-area, .content-wrapper-courses, table"
      ) !== null;
      if (!hasContent && waitAttempts < 20) {
        setTimeout(waitForContent, 500);
        return;
      }
      if (!hasContent) {
        console.log("[BIA] No course content found after 10s, setting up observer only");
      }
      processPage(site);
      const observer = new MutationObserver((mutations) => {
        const isOwnMutation = mutations.every((m) => {
          for (const node of m.addedNodes) {
            if (node instanceof HTMLElement && (node.classList.contains("bia-rmp-badge") || node.classList.contains("bia-rmp-badge-loading") || node.classList.contains("bia-seat-badge") || node.classList.contains("bia-seat-summary") || node.classList.contains("bia-conflict-highlight"))) continue;
            return false;
          }
          for (const node of m.removedNodes) {
            if (node instanceof HTMLElement && (node.classList.contains("bia-rmp-badge") || node.classList.contains("bia-rmp-badge-loading") || node.classList.contains("bia-seat-badge") || node.classList.contains("bia-seat-summary"))) continue;
            return false;
          }
          return true;
        });
        if (isOwnMutation) return;
        debounce(() => processPage(site), 300);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    if (document.readyState === "complete") {
      setTimeout(waitForContent, 300);
    } else {
      window.addEventListener("load", () => setTimeout(waitForContent, 300));
    }
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        processPage(site);
      }
    });
  }
  const isLoginPage = document.querySelector('#loginForm, .shib-login, [action*="login"]') !== null;
  if (isLoginPage) {
    console.log("[BIA] Login page detected, skipping injection");
  } else {
    init();
  }

})();
