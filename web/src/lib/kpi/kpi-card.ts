import type { KpisJson, MetricKey } from "../../data/types.ts";
import { computeDelta, currentWindow, previousWindow, sliceSeries } from "../range/index.ts";
import { computeKpiValue } from "./value.ts";

export interface KpiSummary {
  value: number;
  delta: number | null;
  sparkline: number[];
}

const slicePrev = (xs: readonly number[], start: number, end: number): number[] =>
  xs.slice(start, end);

type SeriesByKey = Record<MetricKey, number[]>;

const buildPrevMetrics = (kpis: KpisJson, start: number, end: number): SeriesByKey => ({
  stories: slicePrev(kpis.metrics.stories, start, end),
  comments: slicePrev(kpis.metrics.comments, start, end),
  activeCommenters: slicePrev(kpis.metrics.activeCommenters, start, end),
  activeSubmitters: slicePrev(kpis.metrics.activeSubmitters, start, end),
  medianScore: slicePrev(kpis.metrics.medianScore, start, end),
  p90Score: slicePrev(kpis.metrics.p90Score, start, end),
  commentsPerStory: slicePrev(kpis.metrics.commentsPerStory, start, end),
  successRateGte100: slicePrev(kpis.metrics.successRateGte100, start, end),
  showHn: slicePrev(kpis.metrics.showHn, start, end),
  askHn: slicePrev(kpis.metrics.askHn, start, end),
  jobs: slicePrev(kpis.metrics.jobs, start, end),
  deadFlaggedRatio: slicePrev(kpis.metrics.deadFlaggedRatio, start, end),
});

export const kpiSummary = (key: MetricKey, kpis: KpisJson, days: number): KpiSummary => {
  const value = computeKpiValue(key, kpis.metrics, days);
  const total = kpis.days.length;
  const prev = previousWindow(total, days);
  const delta =
    prev === null
      ? null
      : computeDelta(
          value,
          computeKpiValue(key, buildPrevMetrics(kpis, prev.start, prev.end), days),
        );
  const cw = currentWindow(total, days);
  const sparkline = sliceSeries(kpis.metrics[key], cw.end - cw.start);
  return { value, delta, sparkline };
};
