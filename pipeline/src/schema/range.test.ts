import { describe, expect, it } from "vitest";
import { isRangeId, RANGE_DAYS, RANGE_IDS, RangeIdSchema } from "./range.ts";

describe("RangeIdSchema", () => {
  it.each(["1w", "1m", "3m", "6m", "1y", "2y"] as const)("accepts %s", (id) => {
    expect(RangeIdSchema.parse(id)).toBe(id);
  });

  it("rejects unknown range ids", () => {
    expect(() => RangeIdSchema.parse("4m")).toThrow();
    expect(() => RangeIdSchema.parse("")).toThrow();
  });
});

describe("RANGE_DAYS", () => {
  it("maps each id to the correct trailing-day count", () => {
    expect(RANGE_DAYS["1w"]).toBe(7);
    expect(RANGE_DAYS["1m"]).toBe(30);
    expect(RANGE_DAYS["3m"]).toBe(90);
    expect(RANGE_DAYS["6m"]).toBe(180);
    expect(RANGE_DAYS["1y"]).toBe(365);
    expect(RANGE_DAYS["2y"]).toBe(730);
  });

  it("covers every RANGE_ID exactly once", () => {
    const keys = Object.keys(RANGE_DAYS).sort();
    const ids = [...RANGE_IDS].sort();
    expect(keys).toEqual(ids);
  });
});

describe("isRangeId", () => {
  it("returns true for known ids and narrows the type", () => {
    const v: unknown = "3m";
    expect(isRangeId(v)).toBe(true);
  });
  it("returns false for unknown values", () => {
    expect(isRangeId("foo")).toBe(false);
    expect(isRangeId(123)).toBe(false);
    expect(isRangeId(null)).toBe(false);
  });
});
