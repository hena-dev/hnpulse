import { computeDomainShares, extractRegistrableDomain } from "../domains/extract.ts";
import type { KpisJson, TopDomainsDay } from "../schema/kpis.ts";
import { METRIC_KEYS, type MetricSeries } from "../schema/metrics.ts";

export interface DailyRow {
  day: string;
  stories: number;
  comments: number;
  active_commenters: number;
  active_submitters: number;
  median_score: number;
  p90_score: number;
  comments_per_story: number;
  success_rate_gte100: number;
  show_hn: number;
  ask_hn: number;
  jobs: number;
  dead_flagged_ratio: number;
}

export interface DomainRow {
  day: string;
  url: string | null;
}

const SQL_TO_METRIC: Readonly<Record<string, keyof MetricSeries>> = {
  stories: "stories",
  comments: "comments",
  active_commenters: "activeCommenters",
  active_submitters: "activeSubmitters",
  median_score: "medianScore",
  p90_score: "p90Score",
  comments_per_story: "commentsPerStory",
  success_rate_gte100: "successRateGte100",
  show_hn: "showHn",
  ask_hn: "askHn",
  jobs: "jobs",
  dead_flagged_ratio: "deadFlaggedRatio",
};

const emptySeries = (n: number): MetricSeries =>
  Object.fromEntries(METRIC_KEYS.map((k) => [k, new Array<number>(n).fill(0)])) as MetricSeries;

export const alignDailyMetrics = (
  days: readonly string[],
  rows: readonly DailyRow[],
): MetricSeries => {
  const series = emptySeries(days.length);
  const indexByDay = new Map(days.map((d, i) => [d, i] as const));
  for (const row of rows) {
    const i = indexByDay.get(row.day);
    if (i === undefined) continue;
    for (const [sqlKey, metricKey] of Object.entries(SQL_TO_METRIC)) {
      const v = (row as unknown as Record<string, unknown>)[sqlKey];
      if (typeof v === "number" && Number.isFinite(v)) series[metricKey][i] = v;
    }
  }
  return series;
};

export const computeTopDomainsByDay = (
  days: readonly string[],
  rows: readonly DomainRow[],
  topN: number,
): TopDomainsDay[] => {
  const counts = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const day of days) counts.set(day, new Map());
  for (const row of rows) {
    const dayMap = counts.get(row.day);
    if (dayMap === undefined) continue;
    const dom = extractRegistrableDomain(row.url);
    if (dom === null) continue;
    dayMap.set(dom, (dayMap.get(dom) ?? 0) + 1);
    totals.set(row.day, (totals.get(row.day) ?? 0) + 1);
  }
  return days.map((date) => ({
    date,
    domains: computeDomainShares(counts.get(date) ?? new Map(), totals.get(date) ?? 0, topN),
  }));
};

export interface AssembleArgs {
  days: readonly string[];
  dailyRows: readonly DailyRow[];
  domainRows: readonly DomainRow[];
  topN?: number;
}

export const assembleKpisJson = (args: AssembleArgs): KpisJson => {
  const days = [...args.days];
  const start = days[0];
  const end = days[days.length - 1];
  if (start === undefined || end === undefined) throw new Error("days must be non-empty");
  return {
    schemaVersion: 1,
    windowStart: start,
    windowEnd: end,
    days,
    metrics: alignDailyMetrics(days, args.dailyRows),
    topDomainsByDay: computeTopDomainsByDay(days, args.domainRows, args.topN ?? 10),
  };
};
