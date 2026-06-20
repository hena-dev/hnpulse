import type { MetricSeries } from "../../data/types.ts";
import { mean, sliceSeries, weightedMean } from "../range/index.ts";

const meanOfTail = (xs: readonly number[], n: number): number => mean(sliceSeries(xs, n));

const ratioOfSums = (num: readonly number[], den: readonly number[], n: number): number => {
  const a = sliceSeries(num, n);
  const b = sliceSeries(den, n);
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < a.length; i += 1) {
    sa += a[i] ?? 0;
    sb += b[i] ?? 0;
  }
  return sb === 0 ? 0 : sa / sb;
};

const computers: Record<keyof MetricSeries, (m: MetricSeries, n: number) => number> = {
  stories: (m, n) => meanOfTail(m.stories, n),
  comments: (m, n) => meanOfTail(m.comments, n),
  activeCommenters: (m, n) => meanOfTail(m.activeCommenters, n),
  activeSubmitters: (m, n) => meanOfTail(m.activeSubmitters, n),
  // Window score KPIs average the daily quantiles; the raw score distribution is not emitted.
  medianScore: (m, n) => meanOfTail(m.medianScore, n),
  p90Score: (m, n) => meanOfTail(m.p90Score, n),
  commentsPerStory: (m, n) => ratioOfSums(m.comments, m.stories, n),
  successRateGte100: (m, n) =>
    weightedMean(sliceSeries(m.successRateGte100, n), sliceSeries(m.stories, n)),
  showHn: (m, n) => meanOfTail(m.showHn, n),
  askHn: (m, n) => meanOfTail(m.askHn, n),
  jobs: (m, n) => meanOfTail(m.jobs, n),
  deadFlaggedRatio: (m, n) =>
    weightedMean(sliceSeries(m.deadFlaggedRatio, n), sliceSeries(m.deadFlaggedTotal, n)),
  deadFlaggedTotal: (m, n) => meanOfTail(m.deadFlaggedTotal, n),
};

export const computeKpiValue = (
  key: keyof MetricSeries,
  metrics: MetricSeries,
  days: number,
): number => computers[key](metrics, days);
