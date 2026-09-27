import { formatDateOnly } from "../../lib/format/date.ts";
import type { BucketPoint } from "../../lib/range/bucket.ts";

export interface SeriesRow {
  date: Date;
  a: number;
  b: number;
}

export const seriesRows = (a: readonly BucketPoint[], b: readonly BucketPoint[]): SeriesRow[] => {
  const second = new Map(b.map((point) => [point.date, point.value]));
  return a.map((point) => ({
    date: new Date(`${point.date}T00:00:00.000Z`),
    a: point.value,
    b: second.get(point.date) ?? 0,
  }));
};

export const seriesFormatters = (rows: readonly SeriesRow[], locale: string) => {
  const spacing = Number(rows[1]?.date) - Number(rows[0]?.date);
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
  const month = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" });
  const year = new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric" });
  const monthYear = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
  const monthly = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  const weekly = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  return {
    tick: (value: Date, first = false) => {
      if (value.getUTCDate() !== 1) return date.format(value);
      if (value.getUTCMonth() === 0) return year.format(value);
      return first ? monthYear.format(value) : month.format(value);
    },
    heading: (value: Date) => {
      if (spacing >= 28 * 86400000) return monthly.format(value);
      if (spacing === 7 * 86400000)
        return weekly.formatRange(value, new Date(Number(value) + 6 * 86400000));
      return formatDateOnly(value.toISOString(), locale);
    },
    number: (value: number) => compact.format(value),
  };
};
