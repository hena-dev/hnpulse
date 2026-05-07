import { type KpisJson, METRIC_KEYS, type MetricKey, type TopDomainEntry } from "../data/types.ts";
import type { KpiSummary } from "./kpi/kpi-card.ts";
import { kpiSummary } from "./kpi/kpi-card.ts";
import { topDomainsForRange } from "./kpi/top-domains.ts";
import { type BucketPoint, bucketForRange, bucketSeries } from "./range/bucket.ts";
import { RANGE_DAYS, type RangeId, sliceSeries } from "./range/range.ts";

const MAX_SPARKLINE_POINTS = 80;

export type KpiSummaries = Readonly<Record<MetricKey, KpiSummary>>;

export interface DetailChartSeries {
  stories: readonly BucketPoint[];
  comments: readonly BucketPoint[];
  activeCommenters: readonly BucketPoint[];
  activeSubmitters: readonly BucketPoint[];
  medianScore: readonly BucketPoint[];
  p90Score: readonly BucketPoint[];
}

export interface DashboardData {
  summaries: KpiSummaries;
  topDomain: TopDomainEntry | null;
  detailSeries: DetailChartSeries;
  topDomains: readonly TopDomainEntry[];
}

const downsample = <T>(values: readonly T[], maxPoints: number): T[] => {
  if (values.length <= maxPoints) return [...values];

  const lastIndex = values.length - 1;
  return Array.from({ length: maxPoints }, (_, i) => {
    const index = Math.round((i * lastIndex) / (maxPoints - 1));
    return values[index] as T;
  });
};

const compactSummary = (summary: KpiSummary): KpiSummary => ({
  ...summary,
  sparkline: downsample(summary.sparkline, MAX_SPARKLINE_POINTS),
});

export const buildDashboardData = (kpis: KpisJson, range: RangeId): DashboardData => {
  const days = RANGE_DAYS[range];
  const bucket = bucketForRange(range);
  const dayLabels = sliceSeries(kpis.days, days);
  const topDomainsInRange = sliceSeries(kpis.topDomainsByDay, days);
  const topDomains = topDomainsForRange(topDomainsInRange, 10);
  const summaries = Object.fromEntries(
    METRIC_KEYS.map((key) => [key, compactSummary(kpiSummary(key, kpis, days))]),
  ) as Record<MetricKey, KpiSummary>;
  const chartSeries = (key: MetricKey): BucketPoint[] =>
    bucketSeries(dayLabels, sliceSeries(kpis.metrics[key], days), bucket);

  return {
    summaries,
    topDomain: topDomains[0] ?? null,
    detailSeries: {
      stories: chartSeries("stories"),
      comments: chartSeries("comments"),
      activeCommenters: chartSeries("activeCommenters"),
      activeSubmitters: chartSeries("activeSubmitters"),
      medianScore: chartSeries("medianScore"),
      p90Score: chartSeries("p90Score"),
    },
    topDomains,
  };
};
