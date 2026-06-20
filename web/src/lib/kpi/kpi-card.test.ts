import { describe, expect, it } from "vitest";
import type { KpisJson } from "../../data/types.ts";
import { METRIC_KEYS } from "../../data/types.ts";
import { kpiSummary } from "./kpi-card.ts";

const topDomainsByRange = { "1w": [], "1m": [], "3m": [], "6m": [], "1y": [], "2y": [] };

const makeKpis = (storiesSeries: number[]): KpisJson => ({
  schemaVersion: 1,
  windowStart: "2024-05-04",
  windowEnd: "2024-05-04",
  days: storiesSeries.map((_, i) => `2024-05-${String(i + 1).padStart(2, "0")}`),
  metrics: Object.fromEntries(
    METRIC_KEYS.map((k) => [k, k === "stories" ? storiesSeries : storiesSeries.map(() => 1)]),
  ) as unknown as KpisJson["metrics"],
  topDomainsByDay: storiesSeries.map(() => ({ date: "2024-05-04", domains: [] })),
  topDomainsByRange,
});

describe("kpiSummary", () => {
  it("returns value, delta and sparkline for current vs previous window", () => {
    // 14 days; current = last 7 (sum 70), previous = first 7 (sum 35)
    const kpis = makeKpis([10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20]);
    const s = kpiSummary("stories", kpis, 7);
    expect(s.value).toBe(20); // mean of last 7
    expect(s.delta).toBeCloseTo((20 - 10) / 10);
    expect(s.sparkline).toEqual([20, 20, 20, 20, 20, 20, 20]);
  });

  it("returns null delta when prior window does not exist", () => {
    const kpis = makeKpis([10, 10, 10]);
    const s = kpiSummary("stories", kpis, 7);
    expect(s.delta).toBeNull();
  });
});
