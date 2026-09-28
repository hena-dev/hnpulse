import { describe, expect, it } from "vitest";
import { assembleKpisJson } from "../aggregate/assemble.ts";
import { stableDailyRow } from "../orchestrator/_test-fixtures.ts";
import { METRIC_KEYS } from "../schema/metrics.ts";
import { plan } from "./_test-fixtures.ts";
import { buildSnapshots } from "./build.ts";
import { daysBetween, offsetDay } from "./dates.ts";
import { countDomains, slidingDomains } from "./domains.ts";

describe("snapshot aggregation", () => {
  it("produces compact complete windows, correct statuses, and the latest feed", () => {
    const p = plan();
    const days = daysBetween(p.aggregateStart, p.last);
    const dailyRows = days.map((day, i) => stableDailyRow(day, 10 + i));
    const built = buildSnapshots({
      plan: p,
      windowDays: 3,
      now: new Date("2026-05-04T00:00:00Z"),
      dailyRows,
      domainRows: [],
    });
    const snapshots = [...built.snapshots()];
    expect(snapshots).toHaveLength(7);
    expect(snapshots[0]?.metrics.stories).toEqual([10, 11, 12]);
    expect(snapshots.at(-1)?.metrics.stories).toEqual([13, 14, 15, 16, 17, 18]);
    expect(snapshots.map((s) => s.status)).toEqual([
      "final",
      "final",
      "final",
      "final",
      "final",
      "provisional",
      "provisional",
    ]);
    for (const value of snapshots) {
      expect(Object.keys(value)).toEqual([
        "schemaVersion",
        "windowStart",
        "windowEnd",
        "metrics",
        "topDomainsByRange",
        "lastUpdated",
        "status",
      ]);
      expect(Object.keys(value.metrics)).toEqual(METRIC_KEYS);
    }
    expect(built.latest.days).toEqual(days.slice(-6));
    expect(built.latest.metrics).toEqual(snapshots.at(-1)?.metrics);
  });

  it("matches independent full aggregation across leap days and all range boundaries", () => {
    const first = "2025-01-01";
    const last = "2025-01-09";
    const aggregateStart = "2023-01-01";
    const p = { ...plan(first, last), archiveFirst: aggregateStart, aggregateStart };
    const days = daysBetween(aggregateStart, last);
    expect(days).toContain("2024-02-29");
    const dailyRows = days.map((day) => stableDailyRow(day));
    const domainRows = days.flatMap((day, i) => [
      { day, url: `https://site${i % 13}.com/story` },
      { day, url: `https://site${i % 7}.com/other` },
      { day, url: i % 2 ? null : "https://common.com/" },
    ]);
    const built = buildSnapshots({
      plan: p,
      windowDays: 730,
      now: new Date("2025-01-10T00:00:00Z"),
      dailyRows,
      domainRows,
    });
    for (const value of built.snapshots()) {
      const reference = assembleKpisJson({
        days: daysBetween(offsetDay(value.windowEnd, -729), value.windowEnd),
        dailyRows,
        domainRows,
      });
      expect(value.topDomainsByRange).toEqual(reference.topDomainsByRange);
      for (const key of METRIC_KEYS)
        expect(value.metrics[key].slice(-730)).toEqual(reference.metrics[key]);
    }
    expect(built.latest.topDomainsByDay).toHaveLength(days.length);
    expect(built.latest.topDomainsByRange).toEqual(
      assembleKpisJson({ days: days.slice(-730), dailyRows, domainRows }).topDomainsByRange,
    );
  });

  it("keeps domains outside daily top ten and counts every recognized link in the denominator", () => {
    const days = daysBetween("2026-01-01", "2026-01-07");
    const rows = days.flatMap((day, i) => [
      ...Array.from({ length: 10 }, (_, j) =>
        Array.from({ length: 2 }, () => ({ day, url: `https://unique${i}x${j}.com` })),
      ).flat(),
      { day, url: "https://shared.com" },
      { day, url: "localhost" },
    ]);
    rows.push({ day: "2025-01-01", url: "https://ignored.com" });
    const move = slidingDomains(countDomains(days, rows), 730);
    expect(move(6)["1w"][0]).toEqual({ name: "shared.com", stories: 7, share: 1 / 21 });
    expect(() => move(6)).toThrow(/monotonically/);
  });

  it("handles fully reused history without generating snapshots", () => {
    const p = { ...plan(), pending: [], archiveFirst: "2026-05-01", aggregateStart: "2026-05-01" };
    const built = buildSnapshots({
      plan: p,
      windowDays: 3,
      now: new Date(),
      dailyRows: [],
      domainRows: [],
    });
    expect([...built.snapshots()]).toEqual([]);
    expect(built.latest.days).toHaveLength(3);
    expect(daysBetween("2026-05-02", "2026-05-01")).toEqual([]);
  });
});
