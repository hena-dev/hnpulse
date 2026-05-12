import { describe, expect, it } from "vitest";
import { formatCount, formatInteger, formatPercent, formatRatio } from "./number.ts";

describe("formatCount", () => {
  it("uses thousands separators for whole numbers", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(1234567)).toBe("1,234,567");
  });
  it("rounds to 0 decimals for >= 100", () => {
    expect(formatCount(1234.7)).toBe("1,235");
  });
  it("uses 1 decimal for 10..100, 2 for <10", () => {
    expect(formatCount(45.678)).toBe("45.7");
    expect(formatCount(7.654)).toBe("7.65");
  });
});

describe("formatPercent", () => {
  it("renders fractional values as percentages with 1 decimal", () => {
    expect(formatPercent(0.0532)).toBe("5.3%");
    expect(formatPercent(0.001)).toBe("0.1%");
  });
  it("handles 0 and 1 cleanly", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(1)).toBe("100.0%");
  });
});

describe("formatInteger", () => {
  it("formats whole counts without decimal places", () => {
    expect(formatInteger(41)).toBe("41");
    expect(formatInteger(1234.7)).toBe("1,235");
  });
});

describe("formatRatio", () => {
  it("formats a ratio like 8.0", () => {
    expect(formatRatio(8.001)).toBe("8.0");
    expect(formatRatio(0.789)).toBe("0.8");
  });
});
