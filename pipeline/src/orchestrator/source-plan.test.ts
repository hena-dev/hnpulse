import { describe, expect, it } from "vitest";
import { buildSourcePlan } from "./source-plan.ts";

describe("buildSourcePlan", () => {
  it("rewrites the 7-day stabilization window and fills BQ-lagging days from the HN API", () => {
    const plan = buildSourcePlan({
      windowStart: "2026-05-04",
      windowEnd: "2026-05-11",
      existingDays: ["2026-05-04"],
      bqCompleteThrough: "2026-05-09",
      stabilizationDays: 7,
    });

    expect(plan.provisionalFrom).toBe("2026-05-05");
    expect(plan.missingImmutableDays).toEqual([]);
    expect(plan.ranges).toEqual([
      { source: "bigquery", start: "2026-05-05", end: "2026-05-09" },
      { source: "hacker-news-api", start: "2026-05-10", end: "2026-05-11" },
    ]);
  });

  it("reports missing immutable days instead of filling them from the live API", () => {
    const plan = buildSourcePlan({
      windowStart: "2026-05-01",
      windowEnd: "2026-05-11",
      existingDays: ["2026-05-03", "2026-05-04"],
      bqCompleteThrough: "2026-04-30",
      stabilizationDays: 7,
    });

    expect(plan.provisionalFrom).toBe("2026-05-05");
    expect(plan.ranges).toEqual([
      { source: "hacker-news-api", start: "2026-05-05", end: "2026-05-11" },
    ]);
    expect(plan.missingImmutableDays).toEqual(["2026-05-01", "2026-05-02"]);
  });

  it("replaces existing mutable fallback days with BigQuery once BQ covers them", () => {
    const plan = buildSourcePlan({
      windowStart: "2026-05-04",
      windowEnd: "2026-05-11",
      existingDays: ["2026-05-04", "2026-05-10", "2026-05-11"],
      bqCompleteThrough: "2026-05-11",
      stabilizationDays: 7,
    });

    expect(plan.ranges).toEqual([{ source: "bigquery", start: "2026-05-05", end: "2026-05-11" }]);
  });
});
