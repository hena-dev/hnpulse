import { describe, expect, it } from "vitest";
import { computeKpiValue } from "./value.ts";

const series = (n: number, v: number): number[] => Array.from({ length: n }, () => v);

describe("computeKpiValue — averaged per-day count metrics", () => {
  const metrics = {
    stories: [10, 20, 30],
    comments: [100, 200, 300],
    activeCommenters: [50, 60, 70],
    activeSubmitters: [5, 6, 7],
    medianScore: [10, 11, 12],
    p90Score: [80, 82, 84],
    commentsPerStory: [10, 10, 10],
    successRateGte100: [0.05, 0.05, 0.05],
    showHn: [3, 4, 5],
    askHn: [2, 3, 4],
    jobs: [1, 2, 3],
    deadFlaggedRatio: [0.01, 0.02, 0.03],
    deadFlaggedTotal: [110, 220, 330],
  };

  it("means daily counts for stories/comments/active*/show/ask/jobs", () => {
    expect(computeKpiValue("stories", metrics, 3)).toBe(20);
    expect(computeKpiValue("comments", metrics, 3)).toBe(200);
    expect(computeKpiValue("activeCommenters", metrics, 3)).toBe(60);
    expect(computeKpiValue("showHn", metrics, 3)).toBe(4);
  });

  it("means daily quantile values for medianScore/p90Score", () => {
    expect(computeKpiValue("medianScore", metrics, 3)).toBe(11);
    expect(computeKpiValue("p90Score", metrics, 3)).toBe(82);
  });

  it("comments per story = sum(comments) / sum(stories) over range", () => {
    const m = { ...metrics, comments: [100, 100, 100], stories: [10, 20, 70] };
    // total comments = 300, total stories = 100 → 3
    expect(computeKpiValue("commentsPerStory", m, 3)).toBe(3);
  });

  it("success rate is weighted by stories", () => {
    const m = {
      ...metrics,
      stories: [100, 100, 100],
      successRateGte100: [0.0, 0.5, 1.0],
    };
    // 0*100 + 0.5*100 + 1.0*100 = 150 over 300 stories = 0.5
    expect(computeKpiValue("successRateGte100", m, 3)).toBe(0.5);
  });

  it("dead/flagged ratio is weighted by the emitted total denominator", () => {
    const m = {
      ...metrics,
      deadFlaggedRatio: [0.5, 0.25, 0],
      deadFlaggedTotal: [10, 100, 990],
    };
    // weights = [10, 100, 990], so low-volume days do not dominate the range KPI.
    expect(computeKpiValue("deadFlaggedRatio", m, 3)).toBeCloseTo(30 / 1100);
  });

  it("returns 0 for ratios when total stories is 0", () => {
    const m = {
      ...metrics,
      stories: [0, 0, 0],
      comments: [0, 0, 0],
      successRateGte100: [0, 0, 0],
    };
    expect(computeKpiValue("commentsPerStory", m, 3)).toBe(0);
    expect(computeKpiValue("successRateGte100", m, 3)).toBe(0);
  });

  it("uses only the trailing N days of the series", () => {
    expect(computeKpiValue("stories", { ...metrics, stories: series(10, 5) }, 3)).toBe(5);
  });

  it("computes every key without throwing", () => {
    for (const k of [
      "stories",
      "comments",
      "activeCommenters",
      "activeSubmitters",
      "medianScore",
      "p90Score",
      "commentsPerStory",
      "successRateGte100",
      "showHn",
      "askHn",
      "jobs",
      "deadFlaggedRatio",
      "deadFlaggedTotal",
    ] as const) {
      expect(typeof computeKpiValue(k, metrics, 3)).toBe("number");
    }
  });
});
