import { type KpisJson, METRIC_KEYS, type MetricKey, type TopDomainEntry } from "../data/types.ts";
import type { KpiSummary } from "./kpi/kpi-card.ts";
import { kpiSummary } from "./kpi/kpi-card.ts";
import { type BucketPoint, bucketForRange, bucketSeries } from "./range/bucket.ts";
import { RANGE_DAYS, RANGE_IDS, type RangeId, sliceSeries } from "./range/range.ts";

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

export type DashboardDataByRange = Readonly<Record<RangeId, DashboardData>>;

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

const topDomainsForDashboardRange = (kpis: KpisJson, range: RangeId): readonly TopDomainEntry[] =>
  kpis.topDomainsByRange?.[range] ?? [];

export const buildDashboardData = (kpis: KpisJson, range: RangeId): DashboardData => {
  const days = RANGE_DAYS[range];
  const bucket = bucketForRange(range);
  const dayLabels = sliceSeries(kpis.days, days);
  const topDomains = topDomainsForDashboardRange(kpis, range);
  const summaries = Object.fromEntries(
    METRIC_KEYS.map((key) => [key, compactSummary(kpiSummary(key, kpis, days))]),
  ) as Record<MetricKey, KpiSummary>;
  const chartSeries = (key: MetricKey, reducer: "sum" | "mean" = "sum"): BucketPoint[] =>
    bucketSeries(dayLabels, sliceSeries(kpis.metrics[key], days), bucket, reducer);

  return {
    summaries,
    topDomain: topDomains[0] ?? null,
    detailSeries: {
      stories: chartSeries("stories"),
      comments: chartSeries("comments"),
      activeCommenters: chartSeries("activeCommenters", "mean"),
      activeSubmitters: chartSeries("activeSubmitters", "mean"),
      medianScore: chartSeries("medianScore", "mean"),
      p90Score: chartSeries("p90Score", "mean"),
    },
    topDomains,
  };
};

export const buildDashboardDataByRange = (kpis: KpisJson): DashboardDataByRange =>
  Object.fromEntries(RANGE_IDS.map((range) => [range, buildDashboardData(kpis, range)])) as Record<
    RangeId,
    DashboardData
  >;
