(function () {
  'use strict';

  const BIA_API_BASE = "https://bia-roommate.vercel.app";

  async function fetchRmpSingle(name) {
    const res = await fetch(
      `${BIA_API_BASE}/api/rmp/search?name=${encodeURIComponent(name)}`,
      { signal: AbortSignal.timeout(8e3) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.avgRating && data.avgRating !== 0) return null;
    return {
      avgRating: data.avgRating,
      avgDifficulty: data.avgDifficulty,
      numRatings: data.numRatings,
      wouldTakeAgainPercent: data.wouldTakeAgainPercent ?? -1,
      legacyId: data.legacyId
    };
  }
  async function fetchRmpBatch(names) {
    const uniqueNames = [...new Set(names)];
    const encodedNames = uniqueNames.map(encodeURIComponent).join(",");
    const res = await fetch(
      `${BIA_API_BASE}/api/rmp/batch?names=${encodedNames}`,
      { signal: AbortSignal.timeout(15e3) }
    );
    if (!res.ok) {
      const results = await Promise.allSettled(
        uniqueNames.map((name) => fetchRmpSingle(name))
      );
      const ratings2 = {};
      for (let i = 0; i < uniqueNames.length; i++) {
        const r = results[i];
        ratings2[uniqueNames[i]] = r.status === "fulfilled" ? r.value : null;
      }
      return ratings2;
    }
    const data = await res.json();
    const batchRatings = data.ratings ?? {};
    const ratings = {};
    for (const name of names) {
      ratings[name] = batchRatings[name] ?? null;
    }
    return ratings;
  }
  async function fetchCourseDetail(courseCode, semester) {
    const [dept, number] = courseCode.split("-");
    if (!dept || !number) return null;
    const res = await fetch(
      `${BIA_API_BASE}/api/courses/${dept}/${number}?semester=${semester}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  }
  async function fetchCoursebinDetails(courses, semester) {
    const results = await Promise.allSettled(
      courses.map((code) => fetchCourseDetail(code, semester))
    );
    return results.filter((r) => r.status === "fulfilled").map((r) => r.value).filter((c) => c !== null);
  }
  async function fetchGECourses(category, semester) {
    const res = await fetch(
      `${BIA_API_BASE}/api/courses/ge?category=${encodeURIComponent(category)}&semester=${semester}`,
      { signal: AbortSignal.timeout(15e3) }
    );
    if (!res.ok) throw new Error(`GE fetch failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.courses ?? [];
  }
  async function fetchRecommendations(interests, semester, units) {
    const body = { interests, semester };
    if (units) body.units = units;
    const res = await fetch(`${BIA_API_BASE}/api/courses/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15e3)
    });
    if (!res.ok) throw new Error(`Recommend failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.recommendations ?? [];
  }

  class StorageCache {
    constructor(config) {
      this.indexLock = Promise.resolve();
      this.config = config;
    }
    storageKey(id) {
      return `${this.config.key}:${id}`;
    }
    indexKey() {
      return `${this.config.key}:__index`;
    }
    // Serialize all index mutations to prevent lost updates
    withIndexLock(fn) {
      const prev = this.indexLock;
      let resolve;
      this.indexLock = new Promise((r) => {
        resolve = r;
      });
      return prev.then(fn).finally(() => resolve());
    }
    async get(id) {
      try {
        const key = this.storageKey(id);
        const result = await chrome.storage.local.get(key);
        const entry = result[key];
        if (!entry) return void 0;
        if (Date.now() - entry.timestamp > this.config.ttlMs) {
          await this.withIndexLock(async () => {
            await chrome.storage.local.remove(key);
            const indexKey = this.indexKey();
            const idxResult = await chrome.storage.local.get(indexKey);
            const index = idxResult[indexKey] || [];
            const filtered = index.filter((i) => i !== id);
            await chrome.storage.local.set({ [indexKey]: filtered });
          });
          return void 0;
        }
        await this.withIndexLock(() => this.touchIndex(id));
        return entry.value;
      } catch {
        return void 0;
      }
    }
    async getMany(ids) {
      const keys = ids.map((id) => this.storageKey(id));
      const result = await chrome.storage.local.get(keys);
      const now = Date.now();
      const found = /* @__PURE__ */ new Map();
      const expiredIds = [];
      const hitIds = [];
      for (const id of ids) {
        const entry = result[this.storageKey(id)];
        if (!entry) continue;
        if (now - entry.timestamp > this.config.ttlMs) {
          expiredIds.push(id);
        } else {
          found.set(id, entry.value);
          hitIds.push(id);
        }
      }
      if (expiredIds.length > 0 || hitIds.length > 0) {
        await this.withIndexLock(async () => {
          const indexKey = this.indexKey();
          const idxResult = await chrome.storage.local.get(indexKey);
          let index = idxResult[indexKey] || [];
          if (expiredIds.length > 0) {
            const keysToRemove = expiredIds.map((id) => this.storageKey(id));
            await chrome.storage.local.remove(keysToRemove);
            const expiredSet = new Set(expiredIds);
            index = index.filter((i) => !expiredSet.has(i));
          }
          if (hitIds.length > 0) {
            const hitSet = new Set(hitIds);
            index = index.filter((i) => !hitSet.has(i));
            index.push(...hitIds);
          }
          await chrome.storage.local.set({ [indexKey]: index });
        });
      }
      return found;
    }
    async set(id, value) {
      const key = this.storageKey(id);
      const entry = { value, timestamp: Date.now() };
      await chrome.storage.local.set({ [key]: entry });
      await this.withIndexLock(async () => {
        await this.touchIndex(id);
        await this.evictIfNeeded();
      });
    }
    async setMany(entries) {
      const items = {};
      const now = Date.now();
      for (const [id, value] of entries) {
        items[this.storageKey(id)] = { value, timestamp: now };
      }
      await chrome.storage.local.set(items);
      await this.withIndexLock(async () => {
        const indexKey = this.indexKey();
        const result = await chrome.storage.local.get(indexKey);
        let index = result[indexKey] || [];
        const newIds = new Set(entries.keys());
        index = index.filter((i) => !newIds.has(i));
        index.push(...newIds);
        await chrome.storage.local.set({ [indexKey]: index });
        await this.evictIfNeeded();
      });
    }
    // Must be called within withIndexLock
    async touchIndex(id) {
      const indexKey = this.indexKey();
      const result = await chrome.storage.local.get(indexKey);
      const index = result[indexKey] || [];
      const filtered = index.filter((i) => i !== id);
      filtered.push(id);
      await chrome.storage.local.set({ [indexKey]: filtered });
    }
    // Must be called within withIndexLock
    async evictIfNeeded() {
      const indexKey = this.indexKey();
      const result = await chrome.storage.local.get(indexKey);
      const index = result[indexKey] || [];
      if (index.length <= this.config.maxEntries) return;
      const toRemove = index.slice(0, index.length - this.config.maxEntries);
      const keysToRemove = toRemove.map((id) => this.storageKey(id));
      await chrome.storage.local.remove(keysToRemove);
      await chrome.storage.local.set({
        [indexKey]: index.slice(toRemove.length)
      });
    }
  }

  const DEFAULT_SETTINGS = {
    showRmpRatings: true,
    highlightConflicts: true,
    showSeatCounts: true,
    semester: "20263"
  };

  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
  });
  const rmpCache = new StorageCache({
    key: "rmp",
    maxEntries: 500,
    ttlMs: 7 * 24 * 60 * 60 * 1e3
    // 7 days
  });
  const courseCache = new StorageCache({
    key: "course",
    maxEntries: 200,
    ttlMs: 24 * 60 * 60 * 1e3
    // 24 hours
  });
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      handleMessage(message).then(sendResponse).catch((err) => {
        console.error("[BIA Worker] Error handling message:", err);
        sendResponse({ type: "ERROR", error: err.message });
      });
      return true;
    }
  );
  async function handleMessage(msg) {
    switch (msg.type) {
      case "RMP_BATCH":
        return handleRmpBatch(msg.names);
      case "COURSEBIN_DETAILS":
        return handleCoursebinDetails(msg.courses, msg.semester);
      case "GE_COURSES":
        return handleGECourses(msg.category, msg.semester);
      case "RECOMMEND":
        return handleRecommend(msg.interests, msg.semester, msg.units);
      case "GET_SETTINGS":
        return handleGetSettings();
      case "SAVE_SETTINGS":
        return handleSaveSettings(msg.settings);
    }
  }
  async function handleRmpBatch(names) {
    const cached = await rmpCache.getMany(names);
    const uncachedNames = names.filter((n) => !cached.has(n));
    let fetched = {};
    if (uncachedNames.length > 0) {
      try {
        fetched = await fetchRmpBatch(uncachedNames);
        const toCache = /* @__PURE__ */ new Map();
        for (const name of uncachedNames) {
          toCache.set(name, fetched[name] ?? null);
        }
        await rmpCache.setMany(toCache);
      } catch (err) {
        console.warn("[BIA Worker] RMP batch fetch failed:", err);
        for (const name of uncachedNames) {
          fetched[name] = null;
        }
      }
    }
    const ratings = {};
    for (const name of names) {
      if (cached.has(name)) {
        ratings[name] = cached.get(name);
      } else {
        ratings[name] = fetched[name] ?? null;
      }
    }
    return { type: "RMP_BATCH_RESULT", ratings };
  }
  async function handleCoursebinDetails(courses, semester) {
    try {
      const cacheKeys = courses.map((c) => `${c}:${semester}`);
      const cached = await courseCache.getMany(cacheKeys);
      const uncachedCodes = courses.filter((c) => !cached.has(`${c}:${semester}`));
      let fetchedCourses = [];
      if (uncachedCodes.length > 0) {
        fetchedCourses = await fetchCoursebinDetails(uncachedCodes, semester);
        const toCache = /* @__PURE__ */ new Map();
        for (const course of fetchedCourses) {
          toCache.set(`${course.department}-${course.number}:${semester}`, course);
        }
        await courseCache.setMany(toCache);
      }
      const result = [];
      for (const code of courses) {
        const cachedCourse = cached.get(`${code}:${semester}`);
        if (cachedCourse) {
          result.push(cachedCourse);
        } else {
          const fetched = fetchedCourses.find(
            (c) => `${c.department}-${c.number}` === code
          );
          if (fetched) result.push(fetched);
        }
      }
      return { type: "COURSEBIN_RESULT", courses: result };
    } catch (err) {
      return { type: "ERROR", error: err.message };
    }
  }
  async function handleGECourses(category, semester) {
    try {
      const courses = await fetchGECourses(category, semester);
      return { type: "GE_RESULT", courses };
    } catch (err) {
      return { type: "ERROR", error: err.message };
    }
  }
  async function handleRecommend(interests, semester, units) {
    try {
      const result = await fetchRecommendations(interests, semester, units);
      return { type: "RECOMMEND_RESULT", recommendations: result };
    } catch (err) {
      return { type: "ERROR", error: err.message };
    }
  }
  async function handleGetSettings() {
    const result = await chrome.storage.local.get("settings");
    return {
      type: "SETTINGS_RESULT",
      settings: { ...DEFAULT_SETTINGS, ...result.settings ?? {} }
    };
  }
  async function handleSaveSettings(settings) {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    await chrome.storage.local.set({ settings: merged });
    return { type: "SETTINGS_RESULT", settings: merged };
  }
  async function checkStorageQuota() {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const THRESHOLD = 8 * 1024 * 1024;
    if (bytesInUse > THRESHOLD) {
      console.warn(`[BIA Worker] Storage usage high: ${(bytesInUse / 1024 / 1024).toFixed(1)}MB`);
    }
  }
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[BIA] Extension installed");
    checkStorageQuota();
  });

})();
