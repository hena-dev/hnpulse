/**
 * §8.6 validation gate — 10× rule applied to the most-recent value of each
 * daily series.  Returns an empty array when no metric is out of range.
 */

export interface Outlier {
  metric: string;
  value: number;
  median: number;
  ratio: number;
}

export const median = (xs: readonly number[]): number => {
  if (xs.length === 0) throw new Error("median of empty array");
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid] as number;
  const a = sorted[mid - 1] as number;
  const b = sorted[mid] as number;
  return (a + b) / 2;
};

const checkSeries = (metric: string, series: readonly number[]): Outlier | null => {
  if (series.length < 8) return null;
  const newest = series[series.length - 1];
  if (newest === undefined) return null;
  const prior = series.slice(-8, -1);
  const med = median(prior);
  if (med === 0) {
    if (newest === 0) return null;
    return { metric, value: newest, median: 0, ratio: Number.POSITIVE_INFINITY };
  }
  const ratio = newest / med;
  if (ratio > 10 || ratio < 0.1) {
    return { metric, value: newest, median: med, ratio };
  }
  return null;
};

export const findOutliers = (metrics: Readonly<Record<string, readonly number[]>>): Outlier[] => {
  const out: Outlier[] = [];
  for (const [metric, series] of Object.entries(metrics)) {
    const o = checkSeries(metric, series);
    if (o !== null) out.push(o);
  }
  return out;
};
