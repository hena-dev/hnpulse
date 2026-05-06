import { startOfUtcDay } from "../dates/utc-day.ts";
import type { BqClient, BqQueryOptions } from "./types.ts";

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
  const startOfYesterday = new Date(startOfToday.getTime() - MS_PER_DAY);
  return maxTs.getTime() >= startOfYesterday.getTime();
};
