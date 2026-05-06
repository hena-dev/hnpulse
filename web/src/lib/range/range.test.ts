import { describe, expect, it } from "vitest";
import { currentWindow, previousWindow, RANGE_DAYS, sliceSeries } from "./range.ts";

describe("RANGE_DAYS", () => {
  it("matches the §4.2 spec", () => {
    expect(RANGE_DAYS).toEqual({
      "1w": 7,
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
      "2y": 730,
    });
  });
});

describe("currentWindow", () => {
  it("returns indices [N - n, N) for trailing-n window", () => {
    expect(currentWindow(10, 3)).toEqual({ start: 7, end: 10 });
  });
  it("clamps when n exceeds length", () => {
    expect(currentWindow(2, 5)).toEqual({ start: 0, end: 2 });
  });
});

describe("previousWindow", () => {
  it("returns indices [N - 2n, N - n)", () => {
    expect(previousWindow(10, 3)).toEqual({ start: 4, end: 7 });
  });
  it("returns null when not enough history", () => {
    expect(previousWindow(5, 3)).toBeNull();
  });
});

describe("sliceSeries", () => {
  it("returns the trailing slice of length n", () => {
    expect(sliceSeries([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });
  it("returns the full series when n >= length", () => {
    expect(sliceSeries([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });
  it("returns empty when n <= 0", () => {
    expect(sliceSeries([1, 2, 3], 0)).toEqual([]);
  });
});
