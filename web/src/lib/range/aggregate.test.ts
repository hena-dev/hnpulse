import { describe, expect, it } from "vitest";
import { mean, sumOver, weightedMean } from "./aggregate.ts";

describe("mean", () => {
  it("returns the arithmetic mean", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it("returns 0 for empty input", () => {
    expect(mean([])).toBe(0);
  });
  it("ignores NaN and Infinity", () => {
    expect(mean([1, Number.NaN, 3, Number.POSITIVE_INFINITY])).toBe(2);
  });
});

describe("sumOver", () => {
  it("sums the series in [start, end)", () => {
    expect(sumOver([1, 2, 3, 4, 5], { start: 1, end: 4 })).toBe(2 + 3 + 4);
  });
  it("returns 0 for an empty range", () => {
    expect(sumOver([1, 2], { start: 1, end: 1 })).toBe(0);
  });
});

describe("weightedMean", () => {
  it("computes Σ(w·v) / Σw", () => {
    expect(weightedMean([1, 2, 3], [1, 1, 2])).toBe((1 + 2 + 6) / 4);
  });
  it("returns 0 when total weight is 0", () => {
    expect(weightedMean([1, 2], [0, 0])).toBe(0);
  });
  it("throws if lengths mismatch", () => {
    expect(() => weightedMean([1], [1, 2])).toThrow();
  });
  it("ignores NaN/Infinity in either array", () => {
    expect(weightedMean([1, Number.NaN, 3], [1, 1, 1])).toBe(2);
    expect(weightedMean([1, 2, 3], [1, Number.POSITIVE_INFINITY, 1])).toBe(2);
  });
});
