export const RANGE_IDS = ["1w", "1m", "3m", "6m", "1y", "2y"] as const;
export type RangeId = (typeof RANGE_IDS)[number];

export const RANGE_DAYS: Readonly<Record<RangeId, number>> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "2y": 730,
};

export interface IndexWindow {
  start: number;
  end: number;
}

export const currentWindow = (length: number, days: number): IndexWindow => {
  const start = Math.max(0, length - days);
  return { start, end: length };
};

export const previousWindow = (length: number, days: number): IndexWindow | null => {
  if (length < days * 2) return null;
  return { start: length - 2 * days, end: length - days };
};

export const sliceSeries = <T>(series: readonly T[], days: number): T[] => {
  if (days <= 0) return [];
  if (days >= series.length) return [...series];
  return series.slice(series.length - days);
};
