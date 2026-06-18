import { describe, it, expect } from "vitest";
import { scoreCompatibility, type HabitInput } from "../compatibility";

function profile(p: Partial<HabitInput>): HabitInput {
  return {
    sleep_habit: null,
    clean_level: null,
    noise_level: null,
    music_habit: null,
    study_style: null,
    tags: null,
    major: null,
    ...p,
  };
}

describe("scoreCompatibility", () => {
  it("scores identical lifestyles near the top with reasons", () => {
    const a = profile({
      sleep_habit: "22点前",
      clean_level: "超级整洁",
      noise_level: "要绝对安静",
      study_style: "图书馆",
    });
    const r = scoreCompatibility(a, a);
    expect(r.comparable).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.map((x) => x.zh)).toContain("都爱整洁");
  });

  it("scores opposite lifestyles far lower than identical ones", () => {
    const early = profile({
      sleep_habit: "22点前",
      clean_level: "超级整洁",
      noise_level: "要绝对安静",
    });
    const night = profile({
      sleep_habit: "凌晨2点+",
      clean_level: "随意",
      noise_level: "热闹都行",
    });
    const opposite = scoreCompatibility(early, night);
    const same = scoreCompatibility(early, early);
    expect(opposite.score).toBeLessThan(same.score - 40);
  });

  it("treats a '无所谓' noise preference as flexible (not an extreme)", () => {
    const quiet = profile({ noise_level: "要绝对安静" });
    const flexible = profile({ noise_level: "无所谓" });
    const loud = profile({ noise_level: "热闹都行" });
    // flexible roommate is a better match for a quiet person than a loud one
    expect(scoreCompatibility(quiet, flexible).score).toBeGreaterThan(
      scoreCompatibility(quiet, loud).score,
    );
  });

  it("is not comparable when there is no shared signal", () => {
    const empty = profile({});
    const r = scoreCompatibility(empty, empty);
    expect(r.comparable).toBe(false);
  });

  it("surfaces shared tags as a reason", () => {
    const a = profile({ tags: ["爱整洁", "爱运动", "不吸烟"] });
    const b = profile({ tags: ["爱运动", "不吸烟", "夜猫子"] });
    const r = scoreCompatibility(a, b);
    expect(r.comparable).toBe(true);
    expect(r.reasons.some((x) => x.zh.includes("共同标签"))).toBe(true);
  });

  it("caps reasons at three", () => {
    const a = profile({
      sleep_habit: "22点前",
      clean_level: "超级整洁",
      noise_level: "要绝对安静",
      study_style: "图书馆",
      major: "CS",
      tags: ["爱整洁", "爱运动"],
    });
    expect(scoreCompatibility(a, a).reasons.length).toBeLessThanOrEqual(3);
  });
});
