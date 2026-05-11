import { alignDailyMetrics, type DailyRow } from "../aggregate/assemble.ts";
import { enumerateUtcDays, parseUtcDay } from "../dates/utc-day.ts";
import type { KpisJson, TopDomainEntry, TopDomainsByRange } from "../schema/kpis.ts";
import { isRangeId, RANGE_IDS } from "../schema/range.ts";
import { buildBqAggregateSql } from "./aggregate-sql.ts";
import type { BqClient } from "./types.ts";

export { buildBqAggregateSql };

export interface BqAggregateArgs {
  windowStart: string;
  windowEnd: string;
  maxBytesBilled: number;
}

export interface BqAggregateRow extends DailyRow {
  top_domains: readonly TopDomainEntry[] | null;
  top_domains_by_range?: readonly BqRangeDomains[] | null;
}

interface BqRangeDomains {
  range_id: string;
  domains: readonly TopDomainEntry[] | null;
}

const topDomainsForDay = (row: BqAggregateRow | undefined): readonly TopDomainEntry[] =>
  row?.top_domains ?? [];

const emptyTopDomainsByRange = (): TopDomainsByRange =>
  Object.fromEntries(RANGE_IDS.map((id) => [id, []] as const)) as unknown as TopDomainsByRange;

const topDomainsByRangeFromRows = (rows: readonly BqAggregateRow[]): TopDomainsByRange => {
  const out = emptyTopDomainsByRange();
  const entries = rows.find((row) => row.top_domains_by_range !== undefined)?.top_domains_by_range;
  for (const entry of entries ?? []) {
    if (isRangeId(entry.range_id)) out[entry.range_id] = [...(entry.domains ?? [])];
  }
  return out;
};

export const aggregateKpisFromBq = async (
  client: BqClient,
  args: BqAggregateArgs,
): Promise<KpisJson> => {
  const days = enumerateUtcDays(parseUtcDay(args.windowStart), parseUtcDay(args.windowEnd));
  const rows = await client.query<BqAggregateRow>(buildBqAggregateSql(), {
    maxBytesBilled: args.maxBytesBilled,
    params: { windowStart: args.windowStart, windowEnd: args.windowEnd },
  });
  const rowByDay = new Map(rows.map((row) => [row.day, row] as const));

  return {
    schemaVersion: 1,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    days,
    metrics: alignDailyMetrics(days, rows),
    topDomainsByDay: days.map((date) => ({
      date,
      domains: [...topDomainsForDay(rowByDay.get(date))],
    })),
    topDomainsByRange: topDomainsByRangeFromRows(rows),
  };
};
