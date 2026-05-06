import { describe, expect, it } from "vitest";
import { formatByType } from "./format-by-type.ts";

describe("formatByType", () => {
  it("formats counts", () => {
    expect(formatByType(1234, "count")).toBe("1,234");
    expect(formatByType(7.5, "count")).toBe("7.50");
  });
  it("formats ratios with 1 decimal", () => {
    expect(formatByType(8.001, "ratio")).toBe("8.0");
  });
  it("formats percent fractions", () => {
    expect(formatByType(0.05, "percent")).toBe("5.0%");
  });
});
