import type { RangeId } from "./range.ts";

export type Bucket = "daily" | "weekly" | "monthly";

export interface BucketPoint {
  date: string;
  value: number;
}

const MS_PER_DAY = 86_400_000;

const pad = (n: number): string => n.toString().padStart(2, "0");

const parseUtc = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};

const fmtUtc = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const startOfIsoWeek = (d: Date): Date => {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(d.getTime() - diff * MS_PER_DAY);
};

const startOfMonth = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

export const bucketForRange = (range: RangeId): Bucket => {
  if (range === "1w" || range === "1m" || range === "3m") return "daily";
  if (range === "6m" || range === "1y") return "weekly";
  return "monthly";
};

const groupBy = (
  days: readonly string[],
  values: readonly number[],
  keyOf: (d: Date) => string,
): BucketPoint[] => {
  const map = new Map<string, number>();
  for (let i = 0; i < days.length; i += 1) {
    const d = days[i];
    const v = values[i];
    if (d === undefined || v === undefined) continue;
    const key = keyOf(parseUtc(d));
    map.set(key, (map.get(key) ?? 0) + v);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
};

export const bucketSeries = (
  days: readonly string[],
  values: readonly number[],
  bucket: Bucket,
): BucketPoint[] => {
  if (bucket === "daily") {
    return days.map((date, i) => ({ date, value: values[i] ?? 0 }));
  }
  const keyOf = bucket === "weekly" ? startOfIsoWeek : startOfMonth;
  return groupBy(days, values, (d) => fmtUtc(keyOf(d)));
};
