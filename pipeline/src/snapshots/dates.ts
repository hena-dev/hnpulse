import { enumerateUtcDays, formatUtcDay, parseUtcDay } from "../dates/utc-day.ts";

export const offsetDay = (day: string, offset: number): string =>
  formatUtcDay(new Date(parseUtcDay(day).getTime() + offset * 86_400_000));

export const daysBetween = (first: string, last: string): string[] =>
  first > last ? [] : enumerateUtcDays(parseUtcDay(first), parseUtcDay(last));
