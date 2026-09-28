import { assembleKpisJson } from "../aggregate/assemble.ts";
import { stableDailyRow } from "../orchestrator/_test-fixtures.ts";
import type { SnapshotJson } from "../schema/snapshot.ts";
import { daysBetween, offsetDay } from "./dates.ts";
import type { SnapshotPlan } from "./store.ts";

export const snapshot = (day = "2026-05-01", windowDays = 3): SnapshotJson => {
  const days = daysBetween(offsetDay(day, 1 - windowDays), day);
  const kpis = assembleKpisJson({
    days,
    dailyRows: days.map((d) => stableDailyRow(d)),
    domainRows: [],
  });
  return {
    schemaVersion: 1,
    windowStart: kpis.windowStart,
    windowEnd: day,
    metrics: kpis.metrics,
    topDomainsByRange: kpis.topDomainsByRange,
    lastUpdated: "2026-05-04T00:00:00.000Z",
    status: "final",
  };
};

export const plan = (first = "2026-04-27", last = "2026-05-03"): SnapshotPlan => ({
  archiveFirst: offsetDay(first, -2),
  first,
  last,
  finalThrough: offsetDay(last, -2),
  existing: new Map(),
  pending: daysBetween(first, last),
  aggregateStart: offsetDay(first, -2),
  refreshFrom: offsetDay(last, -2),
});
