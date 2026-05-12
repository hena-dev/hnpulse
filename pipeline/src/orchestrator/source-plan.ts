import { enumerateUtcDays, formatUtcDay, parseUtcDay } from "../dates/utc-day.ts";

const MS_PER_DAY = 86_400_000;

export type SourceKind = "bigquery" | "hacker-news-api";

export interface SourceRange {
  source: SourceKind;
  start: string;
  end: string;
}

export interface SourcePlan {
  ranges: readonly SourceRange[];
  missingImmutableDays: readonly string[];
  provisionalFrom: string;
}

export interface BuildSourcePlanArgs {
  windowStart: string;
  windowEnd: string;
  existingDays: readonly string[];
  bqCompleteThrough: string;
  stabilizationDays: number;
}

const dayOffset = (day: string, offset: number): string =>
  formatUtcDay(new Date(parseUtcDay(day).getTime() + offset * MS_PER_DAY));

const appendRange = (ranges: SourceRange[], source: SourceKind, day: string): void => {
  const last = ranges[ranges.length - 1];
  if (last !== undefined && last.source === source && dayOffset(last.end, 1) === day) {
    last.end = day;
    return;
  }
  ranges.push({ source, start: day, end: day });
};

export const provisionalStartFor = (
  windowStart: string,
  windowEnd: string,
  days: number,
): string => {
  if (!Number.isInteger(days) || days < 1) throw new Error("stabilizationDays must be positive");
  const candidate = dayOffset(windowEnd, -(days - 1));
  return candidate < windowStart ? windowStart : candidate;
};

export const buildSourcePlan = (args: BuildSourcePlanArgs): SourcePlan => {
  const provisionalFrom = provisionalStartFor(
    args.windowStart,
    args.windowEnd,
    args.stabilizationDays,
  );
  const existing = new Set(args.existingDays);
  const ranges: SourceRange[] = [];
  const missingImmutableDays: string[] = [];

  for (const day of enumerateUtcDays(parseUtcDay(args.windowStart), parseUtcDay(args.windowEnd))) {
    const mutable = day >= provisionalFrom;
    if (!mutable && existing.has(day)) continue;

    if (day <= args.bqCompleteThrough) {
      appendRange(ranges, "bigquery", day);
    } else if (mutable) {
      appendRange(ranges, "hacker-news-api", day);
    } else {
      missingImmutableDays.push(day);
    }
  }

  return { ranges, missingImmutableDays, provisionalFrom };
};
