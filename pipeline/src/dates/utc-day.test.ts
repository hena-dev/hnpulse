import { describe, expect, it } from "vitest";
import {
  daysAgoUtc,
  enumerateUtcDays,
  formatUtcDay,
  parseUtcDay,
  startOfUtcDay,
} from "./utc-day.ts";

describe("startOfUtcDay", () => {
  it("zeroes out the time portion in UTC", () => {
    const d = new Date("2026-05-04T13:45:33.123Z");
    expect(startOfUtcDay(d).toISOString()).toBe("2026-05-04T00:00:00.000Z");
  });
});

describe("formatUtcDay", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    expect(formatUtcDay(new Date("2024-01-02T23:59:59Z"))).toBe("2024-01-02");
  });
  it("does not shift days based on local timezone", () => {
    expect(formatUtcDay(new Date(Date.UTC(2024, 0, 2, 0, 0, 0)))).toBe("2024-01-02");
  });
});

describe("parseUtcDay", () => {
  it("parses YYYY-MM-DD as UTC midnight", () => {
    expect(parseUtcDay("2024-01-02").toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });
  it("throws on bad format", () => {
    expect(() => parseUtcDay("xx")).toThrow();
    expect(() => parseUtcDay("2024-13-01")).toThrow();
  });
});

describe("daysAgoUtc", () => {
  it("returns N days before today (start of UTC day)", () => {
    const today = startOfUtcDay(new Date());
    const seven = daysAgoUtc(7);
    const diff = (today.getTime() - seven.getTime()) / 86_400_000;
    expect(diff).toBe(7);
  });
});

describe("enumerateUtcDays", () => {
  it("yields every UTC day inclusive between start and end", () => {
    const days = enumerateUtcDays(parseUtcDay("2024-01-01"), parseUtcDay("2024-01-04"));
    expect(days).toEqual(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"]);
  });
  it("returns single day when start == end", () => {
    expect(enumerateUtcDays(parseUtcDay("2024-01-01"), parseUtcDay("2024-01-01"))).toEqual([
      "2024-01-01",
    ]);
  });
  it("throws when end < start", () => {
    expect(() => enumerateUtcDays(parseUtcDay("2024-01-02"), parseUtcDay("2024-01-01"))).toThrow();
  });
});
