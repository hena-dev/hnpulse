import { describe, expect, it } from "vitest";
import { stableDailyRow } from "../orchestrator/_test-fixtures.ts";
import { SnapshotJsonSchema } from "../schema/snapshot.ts";
import { buildSnapshots } from "./build.ts";
import { daysBetween, offsetDay } from "./dates.ts";
import { comparisonHistoryStart, snapshotWindowStart } from "./history.ts";

describe("comparison history", () => {
  it.each([
    ["2025-01-01", "2023-01-01", 732],
    ["2026-12-29", "2023-01-01", 1459],
    ["2026-12-30", "2023-01-01", 1460],
    ["2027-01-01", "2023-01-03", 1460],
    ["2028-02-29", "2024-03-02", 1460],
  ])("retains complete available history through %s", (day, start, length) => {
    expect(comparisonHistoryStart(day, 730)).toBe(start);
    expect(daysBetween(start, day)).toHaveLength(length);
    expect(snapshotWindowStart(2, day, 730)).toBe(start);
    expect(snapshotWindowStart(1, day, 730)).toBe(offsetDay(day, -729));
  });

  it("emits two periods in new snapshots and latest feeds, but ranks domains over the selected period only", () => {
    const last = "2027-01-01";
    const aggregateStart = comparisonHistoryStart(last, 730);
    const days = daysBetween(aggregateStart, last);
    const built = buildSnapshots({
      plan: {
        archiveFirst: "2023-01-01",
        first: last,
        last,
        finalThrough: last,
        existing: new Map(),
        pending: [last],
        aggregateStart,
        refreshFrom: last,
      },
      windowDays: 730,
      now: new Date("2027-01-09T14:00:00Z"),
      dailyRows: days.map((day, i) => stableDailyRow(day, i < 730 ? 10 : 15)),
      domainRows: days.map((day, i) => ({
        day,
        url: i < 730 ? "https://previous.com" : "https://current.com",
      })),
    });
    const snapshot = SnapshotJsonSchema.parse([...built.snapshots()][0]);
    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.metrics.stories).toEqual([...Array(730).fill(10), ...Array(730).fill(15)]);
    expect(snapshot.topDomainsByRange["2y"]).toEqual([
      { name: "current.com", stories: 730, share: 1 },
    ]);
    expect(built.latest.metrics).toEqual(snapshot.metrics);
    expect(built.latest.windowStart).toBe(snapshot.windowStart);
    expect(built.latest.days).toHaveLength(1460);
    expect(built.latest.topDomainsByDay).toHaveLength(1460);
    expect(built.latest.topDomainsByRange).toEqual(snapshot.topDomainsByRange);
  });
});
