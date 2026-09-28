import { alignDailyMetrics, type DailyRow, type DomainRow } from "../aggregate/assemble.ts";
import { computeDomainShares } from "../domains/extract.ts";
import type { KpisJson } from "../schema/kpis.ts";
import { METRIC_KEYS, type MetricSeries } from "../schema/metrics.ts";
import type { SnapshotJson } from "../schema/snapshot.ts";
import { daysBetween, offsetDay } from "./dates.ts";
import { countDomains, slidingDomains } from "./domains.ts";
import type { SnapshotPlan } from "./store.ts";

export const buildSnapshots = (args: {
  plan: SnapshotPlan;
  windowDays: number;
  now: Date;
  dailyRows: readonly DailyRow[];
  domainRows: readonly DomainRow[];
}) => {
  const { plan, windowDays } = args;
  const days = daysBetween(plan.aggregateStart, plan.last);
  const metrics = alignDailyMetrics(days, args.dailyRows);
  const dailyDomains = countDomains(days, args.domainRows);
  const moveDomains = slidingDomains(dailyDomains, windowDays);
  const indexByDay = new Map(days.map((day, index) => [day, index]));
  const lastUpdated = args.now.toISOString();
  const build = (day: string): SnapshotJson => {
    const end = indexByDay.get(day) as number;
    const start = end - windowDays + 1;
    return {
      schemaVersion: 1,
      windowStart: offsetDay(day, 1 - windowDays),
      windowEnd: day,
      metrics: Object.fromEntries(
        METRIC_KEYS.map((key) => [key, metrics[key].slice(start, end + 1)]),
      ) as MetricSeries,
      topDomainsByRange: moveDomains(end),
      lastUpdated,
      status: day <= plan.finalThrough ? "final" : "provisional",
    };
  };
  // Materialize one snapshot at a time: backfills otherwise multiply 730-day arrays in memory.
  function* snapshots(): Generator<SnapshotJson> {
    for (const day of plan.pending) yield build(day);
  }
  const latestDomains = slidingDomains(dailyDomains, windowDays)(days.length - 1);
  const latestStart = Math.max(0, days.length - windowDays);
  const latest: KpisJson = {
    schemaVersion: 1,
    windowStart: offsetDay(plan.last, 1 - windowDays),
    windowEnd: plan.last,
    days: days.slice(latestStart),
    metrics: Object.fromEntries(
      METRIC_KEYS.map((key) => [key, metrics[key].slice(latestStart)]),
    ) as MetricSeries,
    topDomainsByRange: latestDomains,
    topDomainsByDay: days.slice(latestStart).map((date, i) => {
      const counts = dailyDomains[latestStart + i] as Map<string, number>;
      const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
      return { date, domains: computeDomainShares(counts, total, 10) };
    }),
  };
  return { latest, snapshots, days, metrics };
};
