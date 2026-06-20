import { describe, expect, it } from "vitest";
import { METRIC_KEYS } from "../schema/metrics.ts";
import {
  alignDailyMetrics,
  assembleKpisJson,
  computeTopDomainsByDay,
  computeTopDomainsByRange,
} from "./assemble.ts";

const dailyRow = (day: string, overrides: Record<string, number> = {}) => ({
  day,
  stories: 10,
  comments: 100,
  active_commenters: 50,
  active_submitters: 8,
  median_score: 12,
  p90_score: 80,
  comments_per_story: 10,
  success_rate_gte100: 0.05,
  show_hn: 1,
  ask_hn: 2,
  jobs: 1,
  dead_flagged_ratio: 0.01,
  dead_flagged_total: 111,
  ...overrides,
});

describe("alignDailyMetrics", () => {
  it("returns 0-filled series for missing days, in day order", () => {
    const days = ["2024-01-01", "2024-01-02", "2024-01-03"];
    const rows = [dailyRow("2024-01-02", { stories: 7 })];
    const out = alignDailyMetrics(days, rows);
    expect(out.stories).toEqual([0, 7, 0]);
    expect(out.comments).toEqual([0, 100, 0]);
  });

  it("yields a complete record with every metric key", () => {
    const days = ["2024-01-01"];
    const out = alignDailyMetrics(days, [dailyRow("2024-01-01")]);
    for (const k of METRIC_KEYS) expect(out[k]).toHaveLength(1);
  });

  it("preserves order even if rows are unsorted", () => {
    const days = ["2024-01-01", "2024-01-02"];
    const rows = [dailyRow("2024-01-02", { stories: 2 }), dailyRow("2024-01-01", { stories: 1 })];
    expect(alignDailyMetrics(days, rows).stories).toEqual([1, 2]);
  });
});

describe("computeTopDomainsByDay", () => {
  it("groups by day, extracts eTLD+1, returns up to N per day", () => {
    const rows = [
      { day: "2024-01-01", url: "https://github.com/a" },
      { day: "2024-01-01", url: "https://github.com/b" },
      { day: "2024-01-01", url: "https://nytimes.com/x" },
      { day: "2024-01-02", url: "https://medium.com/y" },
    ];
    const out = computeTopDomainsByDay(["2024-01-01", "2024-01-02"], rows, 2);
    expect(out[0]?.date).toBe("2024-01-01");
    expect(out[0]?.domains[0]).toEqual({ name: "github.com", stories: 2, share: 2 / 3 });
    expect(out[1]?.domains).toEqual([{ name: "medium.com", stories: 1, share: 1 }]);
  });

  it("emits an empty domains array for days with no urls", () => {
    const out = computeTopDomainsByDay(["2024-01-01"], [], 10);
    expect(out).toEqual([{ date: "2024-01-01", domains: [] }]);
  });

  it("ignores rows whose url cannot be parsed to a domain", () => {
    const rows = [
      { day: "2024-01-01", url: "not-a-url" },
      { day: "2024-01-01", url: "https://github.com/x" },
    ];
    const out = computeTopDomainsByDay(["2024-01-01"], rows, 10);
    expect(out[0]?.domains).toEqual([{ name: "github.com", stories: 1, share: 1 }]);
  });
});

describe("computeTopDomainsByRange", () => {
  it("uses all domain rows in the selected trailing range, not daily top-N rows", () => {
    const rows = [
      { day: "2024-01-01", url: "https://a.com/1" },
      { day: "2024-01-02", url: "https://a.com/2" },
      { day: "2024-01-02", url: "https://b.com/1" },
      { day: "2024-01-03", url: "https://b.com/2" },
    ];
    const out = computeTopDomainsByRange(["2024-01-01", "2024-01-02", "2024-01-03"], rows, 10);
    expect(out["1w"]?.[0]).toEqual({ name: "a.com", stories: 2, share: 0.5 });
    expect(out["2y"]).toHaveLength(2);
  });
});

describe("assembleKpisJson", () => {
  it("produces a schema-valid object", () => {
    const days = ["2024-01-01", "2024-01-02"];
    const rows = days.map((d) => dailyRow(d));
    const obj = assembleKpisJson({
      days,
      dailyRows: rows,
      domainRows: [{ day: "2024-01-01", url: "https://github.com/a" }],
    });
    expect(obj.schemaVersion).toBe(1);
    expect(obj.windowStart).toBe("2024-01-01");
    expect(obj.windowEnd).toBe("2024-01-02");
    expect(obj.days).toEqual(days);
    expect(obj.metrics.stories).toEqual([10, 10]);
    expect(obj.topDomainsByDay).toHaveLength(2);
    expect(obj.topDomainsByRange["1w"]?.[0]?.name).toBe("github.com");
  });

  it("throws when days is empty", () => {
    expect(() => assembleKpisJson({ days: [], dailyRows: [], domainRows: [] })).toThrow();
  });
});

describe("alignDailyMetrics — defensive branches", () => {
  it("ignores rows whose day is not in the days list", () => {
    const out = alignDailyMetrics(
      ["2024-01-01"],
      [dailyRow("2024-01-02", { stories: 99 }), dailyRow("2024-01-01", { stories: 5 })],
    );
    expect(out.stories).toEqual([5]);
  });

  it("ignores non-finite numeric values from rows", () => {
    const out = alignDailyMetrics(
      ["2024-01-01"],
      [dailyRow("2024-01-01", { stories: Number.NaN as unknown as number })],
    );
    expect(out.stories).toEqual([0]);
  });
});

describe("computeTopDomainsByDay — defensive branches", () => {
  it("ignores rows whose day is not in the days list", () => {
    const out = computeTopDomainsByDay(
      ["2024-01-01"],
      [{ day: "2099-01-01", url: "https://x.com/" }],
      10,
    );
    expect(out[0]?.domains).toEqual([]);
  });
});
