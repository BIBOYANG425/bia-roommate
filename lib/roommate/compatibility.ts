// Roommate compatibility scoring.
//
// The submit/onboarding forms collect 5 lifestyle habits + interest tags, but
// the browse page only ever sorted by created_at — so the homepage's promise of
// a "compatibility algorithm" was never real. This module makes it real, with a
// transparent, explainable score computed entirely client-side from data we
// already have. Zero schema, fully reversible.
//
// v1 stance: "similar is better" for every habit (sleep schedule, cleanliness,
// noise, music, study style all cause conflict when mismatched). Some dimensions
// could be "complementary is better" instead — that weighting is a product
// decision (see SIMPLIFICATION review openQuestions); kept simple and tunable.

import {
  type RoommateProfile,
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
} from "@/lib/types";

export type Bilingual = { zh: string; en: string };

export type Compatibility = {
  /** 0–100. Only meaningful when `comparable` is true. */
  score: number;
  /** Up to 3 human reasons for the score, strongest first. */
  reasons: Bilingual[];
  /** False when neither side shared enough data to compute anything real. */
  comparable: boolean;
};

/** The subset of a profile the score needs — works on partial public rows. */
export type HabitInput = Pick<
  RoommateProfile,
  | "sleep_habit"
  | "clean_level"
  | "noise_level"
  | "music_habit"
  | "study_style"
  | "tags"
  | "major"
>;

// "don't care" sentinels — treated as flexible rather than an ordinal extreme.
const NOISE_WILDCARD = "无所谓";
const MUSIC_WILDCARD = "无所谓";
const STUDY_WILDCARD = "随心";

// Real roommate conflict weights: sleep & cleanliness dominate.
const WEIGHTS = { sleep: 1.0, clean: 1.0, noise: 0.9, music: 0.5, study: 0.45 };

/** Ordinal similarity over an options list: identical = 1, max distance = 0. */
function ordinalSim(
  a: string | null,
  b: string | null,
  options: readonly string[],
): number | null {
  if (!a || !b) return null;
  const ia = options.indexOf(a);
  const ib = options.indexOf(b);
  if (ia < 0 || ib < 0) return null;
  const span = options.length - 1;
  return span === 0 ? 1 : 1 - Math.abs(ia - ib) / span;
}

/** Ordinal, but a "don't care" value on either side scores as flexible. */
function flexibleSim(
  a: string | null,
  b: string | null,
  options: readonly string[],
  wildcard: string,
): number | null {
  if (!a || !b) return null;
  if (a === wildcard || b === wildcard) return 0.85;
  return ordinalSim(a, b, options);
}

/** Study location is categorical: same = 1, either flexible = 0.8, else 0.4. */
function studySim(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  if (a === STUDY_WILDCARD || b === STUDY_WILDCARD) return 0.8;
  return a === b ? 1 : 0.4;
}

function bothIn(a: string | null, b: string | null, set: string[]): boolean {
  return !!a && !!b && set.includes(a) && set.includes(b);
}

const EXACT = 0.999; // treat as an exact-match reason

export function scoreCompatibility(
  me: HabitInput,
  other: HabitInput,
): Compatibility {
  let weighted = 0;
  let weightSum = 0;
  const reasons: Bilingual[] = [];

  const fold = (sim: number | null, weight: number) => {
    if (sim === null) return;
    weighted += sim * weight;
    weightSum += weight;
  };

  const sleepSim = ordinalSim(me.sleep_habit, other.sleep_habit, SLEEP_OPTIONS);
  fold(sleepSim, WEIGHTS.sleep);
  if (sleepSim !== null && sleepSim >= EXACT) {
    reasons.push({ zh: "作息相近", en: "Similar sleep schedule" });
  }

  const cleanSim = ordinalSim(me.clean_level, other.clean_level, CLEAN_OPTIONS);
  fold(cleanSim, WEIGHTS.clean);
  if (cleanSim !== null && cleanSim >= EXACT) {
    const bothTidy =
      me.clean_level === "较整洁" || me.clean_level === "超级整洁";
    reasons.push(
      bothTidy
        ? { zh: "都爱整洁", en: "Both keep it tidy" }
        : { zh: "整洁习惯一致", en: "Same tidiness" },
    );
  }

  const noiseSim = flexibleSim(
    me.noise_level,
    other.noise_level,
    NOISE_OPTIONS,
    NOISE_WILDCARD,
  );
  fold(noiseSim, WEIGHTS.noise);
  if (
    noiseSim !== null &&
    noiseSim >= EXACT &&
    bothIn(me.noise_level, other.noise_level, ["要绝对安静", "偏安静"])
  ) {
    reasons.push({ zh: "都喜欢安静", en: "Both prefer quiet" });
  }

  fold(
    flexibleSim(me.music_habit, other.music_habit, MUSIC_OPTIONS, MUSIC_WILDCARD),
    WEIGHTS.music,
  );

  const sSim = studySim(me.study_style, other.study_style);
  fold(sSim, WEIGHTS.study);
  if (
    sSim !== null &&
    sSim >= EXACT &&
    me.study_style === other.study_style &&
    me.study_style !== STUDY_WILDCARD
  ) {
    reasons.push({ zh: "学习方式一致", en: "Same study style" });
  }

  // Tag overlap — interest signal that nudges the score, never dominates it.
  const myTags = new Set(me.tags ?? []);
  const shared = (other.tags ?? []).filter((t) => myTags.has(t));
  if (shared.length >= 2) {
    reasons.push({
      zh: `${shared.length} 个共同标签`,
      en: `${shared.length} shared traits`,
    });
  } else if (shared.length === 1) {
    reasons.push({ zh: `都「${shared[0]}」`, en: `Both: ${shared[0]}` });
  }

  if (me.major && other.major && me.major === other.major) {
    reasons.push({ zh: "同专业", en: "Same major" });
  }

  const comparable = weightSum > 0 || shared.length > 0;
  // Lifestyle similarity is the base; shared tags add a capped nudge on top.
  const base =
    weightSum > 0 ? weighted / weightSum : shared.length > 0 ? 0.55 : 0.5;
  const tagBump = Math.min(shared.length, 3) * 4; // up to +12, never the driver
  const score = Math.min(100, Math.round(base * 100 + tagBump));

  // Strongest reasons first: lifestyle reasons were pushed before tag/major ones.
  return { score, reasons: reasons.slice(0, 3), comparable };
}
