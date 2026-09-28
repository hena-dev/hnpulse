import { ARCHIVE_START } from "../release/archive.ts";
import { offsetDay } from "./dates.ts";

/** Two equal-length periods, limited to the permanent raw archive's coverage. */
export const comparisonHistoryStart = (
  day: string,
  windowDays: number,
  archiveFirst = ARCHIVE_START,
): string => {
  const candidate = offsetDay(day, 1 - windowDays * 2);
  return candidate < archiveFirst ? archiveFirst : candidate;
};

/** Version 1 final snapshots keep their original, single-period window forever. */
export const snapshotWindowStart = (
  version: 1 | 2,
  day: string,
  windowDays: number,
  archiveFirst = ARCHIVE_START,
): string =>
  version === 1
    ? offsetDay(day, 1 - windowDays)
    : comparisonHistoryStart(day, windowDays, archiveFirst);
