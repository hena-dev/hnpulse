import type { SnapshotBounds } from "../../data/types.ts";

export const MIN_SNAPSHOT_DAY = "2025-01-01";
export const DAY_MS = 86_400_000;
export const utcDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
export const dayString = (day: Date): string => day.toISOString().slice(0, 10);
export const addDays = (day: string, count: number): string =>
  dayString(new Date(utcDay(day).getTime() + count * DAY_MS));
export const isSnapshotDay = (day: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  Number.isFinite(utcDay(day).getTime()) &&
  dayString(utcDay(day)) === day;
export const firstSnapshotDay = (bounds: SnapshotBounds): string =>
  bounds.first > MIN_SNAPSHOT_DAY ? bounds.first : MIN_SNAPSHOT_DAY;
export const snapshotDate = (search: string, bounds?: SnapshotBounds): string | null => {
  const dates = new URLSearchParams(search).getAll("date");
  const day = dates[0];
  return bounds &&
    dates.length === 1 &&
    day &&
    isSnapshotDay(day) &&
    day >= firstSnapshotDay(bounds) &&
    day <= bounds.last
    ? day
    : null;
};
export const datedPath = (path: string, date: string | null): string =>
  date === null ? path : `${path}?date=${date}`;
