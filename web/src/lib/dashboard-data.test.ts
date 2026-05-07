import { describe, expect, it } from "vitest";
import { type KpisJson, METRIC_KEYS } from "../data/types.ts";
import { buildDashboardData } from "./dashboard-data.ts";

const dateAt = (offset: number): string =>
  new Date(Date.UTC(2024, 0, offset + 1)).toISOString().slice(0, 10);

const makeKpis = (storiesSeries: number[]): KpisJson => {
  const days = storiesSeries.map((_, i) => dateAt(i));
  return {
    schemaVersion: 1,
    windowStart: days[0] ?? "2024-01-01",
    windowEnd: days[days.length - 1] ?? "2024-01-01",
    days,
    metrics: Object.fromEntries(
      METRIC_KEYS.map((k) => [k, storiesSeries]),
    ) as unknown as KpisJson["metrics"],
    topDomainsByDay: days.map((date, i) => ({
      date,
      domains: [
        i % 2 === 0
          ? { name: "a.example", stories: 2, share: 1 }
          : { name: "b.example", stories: 1, share: 1 },
      ],
    })),
  };
};

describe("buildDashboardData", () => {
  it("precomputes KPI summaries, chart series and top domains for the selected range", () => {
    const kpis = makeKpis([10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20]);
    const data = buildDashboardData(kpis, "1w");

    expect(data.summaries.stories.value).toBe(20);
    expect(data.summaries.stories.delta).toBeCloseTo(1);
    expect(data.summaries.stories.sparkline).toEqual([20, 20, 20, 20, 20, 20, 20]);
    expect(data.detailSeries.stories).toEqual(
      kpis.days.slice(-7).map((date) => ({ date, value: 20 })),
    );
    expect(data.topDomain).toEqual({ name: "a.example", stories: 6, share: 0.6 });
    expect(data.topDomains).toHaveLength(2);
  });

  it("caps card sparklines while preserving the first and last visible values", () => {
    const kpis = makeKpis(Array.from({ length: 100 }, (_, i) => i + 1));
    const data = buildDashboardData(kpis, "1y");
    const sparkline = data.summaries.stories.sparkline;

    expect(sparkline).toHaveLength(80);
    expect(sparkline[0]).toBe(1);
    expect(sparkline[sparkline.length - 1]).toBe(100);
  });

  it("returns null for the top domain when no domains exist in the range", () => {
    const kpis = makeKpis([1, 2, 3]);
    const data = buildDashboardData(
      {
        ...kpis,
        topDomainsByDay: kpis.days.map((date) => ({ date, domains: [] })),
      },
      "1w",
    );

    expect(data.topDomain).toBeNull();
    expect(data.topDomains).toEqual([]);
  });
});
