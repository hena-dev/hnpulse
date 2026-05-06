import { describe, expect, it } from "vitest";
import { computeDelta } from "./delta.ts";

describe("computeDelta — §5.5", () => {
  it("returns (current - previous) / previous when previous > 0", () => {
    expect(computeDelta(110, 100)).toBeCloseTo(0.1);
    expect(computeDelta(95, 100)).toBeCloseTo(-0.05);
  });

  it("returns +Infinity when previous == 0 and current > 0", () => {
    expect(computeDelta(5, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns 0 when previous == 0 and current == 0", () => {
    expect(computeDelta(0, 0)).toBe(0);
  });

  it("returns 0 when previous == 0 and current < 0 (defensive)", () => {
    expect(computeDelta(-5, 0)).toBe(0);
  });

  it("returns NaN when current is NaN", () => {
    expect(Number.isNaN(computeDelta(Number.NaN, 1))).toBe(true);
  });
});
