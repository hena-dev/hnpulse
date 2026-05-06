import { describe, expect, it } from "vitest";
import { classifyDelta, formatDelta } from "./delta.ts";

describe("formatDelta", () => {
  it("renders a positive delta with ▲ and 1 decimal percent", () => {
    expect(formatDelta(0.052)).toBe("+5.2% ▲");
  });
  it("renders a negative delta with ▼", () => {
    expect(formatDelta(-0.011)).toBe("−1.1% ▼");
  });
  it("renders zero as 0.0%", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });
  it("renders +∞ when delta is +Infinity", () => {
    expect(formatDelta(Number.POSITIVE_INFINITY)).toBe("+∞");
  });
  it("renders − when delta is NaN", () => {
    expect(formatDelta(Number.NaN)).toBe("—");
  });
});

describe("classifyDelta", () => {
  it("returns 'up' for positive non-zero", () => {
    expect(classifyDelta(0.001)).toBe("up");
    expect(classifyDelta(Number.POSITIVE_INFINITY)).toBe("up");
  });
  it("returns 'down' for negative", () => {
    expect(classifyDelta(-0.001)).toBe("down");
  });
  it("returns 'flat' for zero or NaN", () => {
    expect(classifyDelta(0)).toBe("flat");
    expect(classifyDelta(Number.NaN)).toBe("flat");
  });
});
