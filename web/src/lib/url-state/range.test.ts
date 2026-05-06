import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, parseRangeFromUrl, resolveInitialRange } from "./range.ts";

describe("parseRangeFromUrl", () => {
  it("returns the range from ?range=", () => {
    expect(parseRangeFromUrl("https://x/?range=3m")).toBe("3m");
  });
  it("returns null for missing ?range=", () => {
    expect(parseRangeFromUrl("https://x/")).toBeNull();
  });
  it("returns null for unknown range value", () => {
    expect(parseRangeFromUrl("https://x/?range=4m")).toBeNull();
  });
  it("returns null for malformed URL", () => {
    expect(parseRangeFromUrl("not a url")).toBeNull();
  });
});

describe("resolveInitialRange", () => {
  it("prefers URL when present", () => {
    expect(resolveInitialRange("https://x/?range=6m", "1y")).toBe("6m");
  });
  it("falls back to localStorage when URL has no range", () => {
    expect(resolveInitialRange("https://x/", "1y")).toBe("1y");
  });
  it("falls back to default when both are absent", () => {
    expect(resolveInitialRange("https://x/", null)).toBe(DEFAULT_RANGE);
  });
  it("ignores invalid localStorage value", () => {
    expect(resolveInitialRange("https://x/", "not-a-range")).toBe(DEFAULT_RANGE);
  });
});
