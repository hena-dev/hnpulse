import { describe, expect, it } from "vitest";
import { findEmptyDays } from "./coverage.ts";

describe("findEmptyDays \u2014 \u00a713.1 date coverage", () => {
  it("returns [] when every day has \u22651 story", () => {
    expect(findEmptyDays(["2024-01-01", "2024-01-02"], [10, 12])).toEqual([]);
  });

  it("returns the dates whose stories count is 0", () => {
    expect(findEmptyDays(["2024-01-01", "2024-01-02", "2024-01-03"], [5, 0, 7])).toEqual([
      "2024-01-02",
    ]);
  });

  it("returns the dates whose stories count is missing/non-finite", () => {
    expect(
      findEmptyDays(["2024-01-01", "2024-01-02"], [Number.NaN as unknown as number, 10]),
    ).toEqual(["2024-01-01"]);
  });

  it("flags negative story counts as empty (defensive)", () => {
    expect(findEmptyDays(["2024-01-01", "2024-01-02"], [-3, 10])).toEqual(["2024-01-01"]);
  });

  it("throws if days and series have different lengths", () => {
    expect(() => findEmptyDays(["2024-01-01"], [1, 2])).toThrow();
  });
});
