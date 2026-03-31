import {
  fetchRmpBatch,
  fetchCoursebinDetails,
  fetchGECourses,
  fetchRecommendations,
} from "./api-client";
import { StorageCache } from "./cache";
import type {
  BackgroundMessage,
  BackgroundResponse,
  RmpRating,
  Course,
  ExtensionSettings,
} from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";

// ─── Set up chrome.storage.session access for content scripts ───
chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

// ─── Caches (persist across service worker restarts) ───
const rmpCache = new StorageCache<RmpRating | null>({
  key: "rmp",
  maxEntries: 500,
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const courseCache = new StorageCache<unknown>({
  key: "course",
  maxEntries: 200,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
});

// ─── Message handler ───
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        console.error("[BIA Worker] Error handling message:", err);
        sendResponse({
          type: "ERROR",
          error: err.message,
        } as BackgroundResponse);
      });
    return true; // keep channel open for async response
  },
);

async function handleMessage(
  msg: BackgroundMessage,
): Promise<BackgroundResponse> {
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

async function handleRmpBatch(names: string[]): Promise<BackgroundResponse> {
  // Check cache first
  const cached = await rmpCache.getMany(names);
  const uncachedNames = names.filter((n) => !cached.has(n));

  let fetched: Record<string, RmpRating | null> = {};

  if (uncachedNames.length > 0) {
    try {
      fetched = await fetchRmpBatch(uncachedNames);

      // Cache results
      const toCache = new Map<string, RmpRating | null>();
      for (const name of uncachedNames) {
        toCache.set(name, fetched[name] ?? null);
      }
      await rmpCache.setMany(toCache);
    } catch (err) {
      console.warn("[BIA Worker] RMP batch fetch failed:", err);
      // Return cached results + nulls for failed lookups
      for (const name of uncachedNames) {
        fetched[name] = null;
      }
    }
  }

  // Merge cached + fetched
  const ratings: Record<string, RmpRating | null> = {};
  for (const name of names) {
    if (cached.has(name)) {
      ratings[name] = cached.get(name)!;
    } else {
      ratings[name] = fetched[name] ?? null;
    }
  }

  return { type: "RMP_BATCH_RESULT", ratings };
}

async function handleCoursebinDetails(
  courses: string[],
  semester: string,
): Promise<BackgroundResponse> {
  try {
    // Check cache first
    const cacheKeys = courses.map((c) => `${c}:${semester}`);
    const cached = await courseCache.getMany(cacheKeys);
    const uncachedCodes = courses.filter(
      (c) => !cached.has(`${c}:${semester}`),
    );

    let fetchedCourses: Course[] = [];
    if (uncachedCodes.length > 0) {
      fetchedCourses = await fetchCoursebinDetails(uncachedCodes, semester);

      // Cache fetched results
      const toCache = new Map<string, unknown>();
      for (const course of fetchedCourses) {
        toCache.set(
          `${course.department}-${course.number}:${semester}`,
          course,
        );
      }
      await courseCache.setMany(toCache);
    }

    // Merge cached + fetched
    const result: Course[] = [];
    for (const code of courses) {
      const cachedCourse = cached.get(`${code}:${semester}`);
      if (cachedCourse) {
        result.push(cachedCourse as Course);
      } else {
        const fetched = fetchedCourses.find(
          (c) => `${c.department}-${c.number}` === code,
        );
        if (fetched) result.push(fetched);
      }
    }

    return { type: "COURSEBIN_RESULT", courses: result };
  } catch (err) {
    return { type: "ERROR", error: (err as Error).message };
  }
}

async function handleGECourses(
  category: string,
  semester: string,
): Promise<BackgroundResponse> {
  try {
    const courses = await fetchGECourses(category, semester);
    return { type: "GE_RESULT", courses };
  } catch (err) {
    return { type: "ERROR", error: (err as Error).message };
  }
}

async function handleRecommend(
  interests: string,
  semester: string,
  units?: string,
): Promise<BackgroundResponse> {
  try {
    const result = await fetchRecommendations(interests, semester, units);
    return { type: "RECOMMEND_RESULT", recommendations: result };
  } catch (err) {
    return { type: "ERROR", error: (err as Error).message };
  }
}

async function handleGetSettings(): Promise<BackgroundResponse> {
  const result = await chrome.storage.local.get("settings");
  return {
    type: "SETTINGS_RESULT",
    settings: { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) },
  };
}

async function handleSaveSettings(
  settings: ExtensionSettings,
): Promise<BackgroundResponse> {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  await chrome.storage.local.set({ settings: merged });
  return { type: "SETTINGS_RESULT", settings: merged };
}

// ─── Check storage quota periodically ───
async function checkStorageQuota() {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  const THRESHOLD = 8 * 1024 * 1024; // 8MB

  if (bytesInUse > THRESHOLD) {
    console.warn(
      `[BIA Worker] Storage usage high: ${(bytesInUse / 1024 / 1024).toFixed(1)}MB`,
    );
    // Eviction is handled by the cache's maxEntries limit
    // If still over, could clear old caches entirely
  }
}

// Run quota check on install and periodically
chrome.runtime.onInstalled.addListener(() => {
  console.log("[BIA] Extension installed");
  checkStorageQuota();
});
