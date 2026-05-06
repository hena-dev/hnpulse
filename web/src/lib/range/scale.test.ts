import { describe, expect, it } from "vitest";
import { ordersOfMagnitude, shouldOfferLogScale } from "./scale.ts";

describe("ordersOfMagnitude", () => {
  it("returns log10(max/min) for positive series", () => {
    expect(ordersOfMagnitude([1, 100])).toBeCloseTo(2);
    expect(ordersOfMagnitude([10, 1000])).toBeCloseTo(2);
  });
  it("returns 0 when values are equal", () => {
    expect(ordersOfMagnitude([5, 5, 5])).toBe(0);
  });
  it("ignores 0 and negative values", () => {
    expect(ordersOfMagnitude([0, 0, 100, 200])).toBeCloseTo(Math.log10(200 / 100));
  });
  it("returns 0 when no positive values", () => {
    expect(ordersOfMagnitude([0, 0, -1])).toBe(0);
  });
});

describe("shouldOfferLogScale", () => {
  it("true when range spans > 2 orders of magnitude", () => {
    expect(shouldOfferLogScale([1, 1000])).toBe(true);
  });
  it("false at exactly 2 orders of magnitude", () => {
    expect(shouldOfferLogScale([1, 100])).toBe(false);
  });
  it("false for narrow ranges", () => {
    expect(shouldOfferLogScale([10, 50])).toBe(false);
  });
});
