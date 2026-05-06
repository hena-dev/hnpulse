import { describe, expect, it } from "vitest";
import { findOutliers, median } from "./outliers.ts";

describe("median", () => {
  it("returns the middle of a sorted odd-length series", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([3, 1, 2])).toBe(2);
  });
  it("returns the average of the two middles for an even series", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("throws on empty input", () => {
    expect(() => median([])).toThrow();
  });
});

describe("findOutliers — 10x / 0.1x rule", () => {
  it("returns no outliers when the new value is within range of the 7-day median", () => {
    const series = [10, 9, 11, 10, 12, 9, 10, 10];
    const out = findOutliers({ stories: series });
    expect(out).toEqual([]);
  });

  it("flags a new value > 10× the 7-day median (excluding new)", () => {
    const series = [10, 10, 10, 10, 10, 10, 10, 200];
    const out = findOutliers({ stories: series });
    expect(out).toEqual([{ metric: "stories", value: 200, median: 10, ratio: 20 }]);
  });

  it("flags a new value < 0.1× the 7-day median", () => {
    const series = [10, 10, 10, 10, 10, 10, 10, 0.5];
    const out = findOutliers({ stories: series });
    expect(out[0]?.ratio).toBe(0.05);
  });

  it("returns no outlier if the median (excl. new) is 0 and new is also 0", () => {
    const series = [0, 0, 0, 0, 0, 0, 0, 0];
    expect(findOutliers({ ratio: series })).toEqual([]);
  });

  it("flags as outlier when median is 0 and new is positive", () => {
    const series = [0, 0, 0, 0, 0, 0, 0, 5];
    const out = findOutliers({ ratio: series });
    expect(out[0]).toMatchObject({ metric: "ratio", median: 0, value: 5 });
    expect(Number.isFinite(out[0]?.ratio ?? 0)).toBe(false);
  });

  it("ignores series with fewer than 8 points (need 7 prior + 1 new)", () => {
    const series = [10, 10, 10];
    expect(findOutliers({ stories: series })).toEqual([]);
  });

  it("checks every metric independently", () => {
    const out = findOutliers({
      good: [10, 10, 10, 10, 10, 10, 10, 11],
      bad: [10, 10, 10, 10, 10, 10, 10, 500],
    });
    expect(out.map((o) => o.metric)).toEqual(["bad"]);
  });
});
