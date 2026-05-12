import { formatUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import type { BqClient, BqQueryOptions } from "./types.ts";

const END_OF_YESTERDAY_GRACE_MS = 15 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

const FRESHNESS_SQL = `
SELECT MAX(timestamp) AS max_ts
FROM \`bigquery-public-data.hacker_news.full\`
`;

interface MaxTsRow {
  max_ts: string | { value: string } | null;
}

const coerceMaxTs = (raw: MaxTsRow["max_ts"]): Date => {
  if (raw === null) throw new Error("BQ returned NULL max_ts");
  if (typeof raw === "string") return new Date(raw);
  if (typeof raw === "object" && typeof raw.value === "string") return new Date(raw.value);
  throw new Error("BQ returned unexpected max_ts shape");
};

export const fetchMaxTimestamp = async (
  client: BqClient,
  options: BqQueryOptions,
): Promise<Date> => {
  const rows = await client.query<MaxTsRow>(FRESHNESS_SQL, options);
  const first = rows[0];
  if (first === undefined) throw new Error("BQ MAX(timestamp) returned no rows");
  return coerceMaxTs(first.max_ts);
};

/**
 * Per §8.2 — true when the source has been refreshed through "yesterday"
 * (UTC) or later, relative to the supplied `now`.
 */
export const isFreshAsOf = (maxTs: Date, now: Date): boolean => {
  const startOfToday = startOfUtcDay(now);
  // MAX(timestamp) is row-based, so allow a small gap before midnight.
  return maxTs.getTime() >= startOfToday.getTime() - END_OF_YESTERDAY_GRACE_MS;
};

export const completeUtcDayThrough = (maxTs: Date): string => {
  const maxDayStart = startOfUtcDay(maxTs);
  const nextDayStart = maxDayStart.getTime() + MS_PER_DAY;
  const completeDay =
    maxTs.getTime() >= nextDayStart - END_OF_YESTERDAY_GRACE_MS
      ? maxDayStart
      : new Date(maxDayStart.getTime() - MS_PER_DAY);
  return formatUtcDay(completeDay);
};
