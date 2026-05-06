import { alignDailyMetrics, type DailyRow } from "../aggregate/assemble.ts";
import { enumerateUtcDays, parseUtcDay } from "../dates/utc-day.ts";
import type { KpisJson, TopDomainEntry } from "../schema/kpis.ts";
import type { BqClient } from "./types.ts";

export interface BqAggregateArgs {
  windowStart: string;
  windowEnd: string;
  maxBytesBilled: number;
}

export interface BqAggregateRow extends DailyRow {
  top_domains: readonly TopDomainEntry[] | null;
}

export const buildBqAggregateSql = (): string => `
WITH
  all_dedup AS (
    SELECT * EXCEPT(rn) FROM (
      SELECT
        id,
        type,
        \`by\` AS author,
        title,
        url,
        score,
        timestamp,
        dead,
        deleted,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) AS rn
      FROM \`bigquery-public-data.hacker_news.full\`
      WHERE timestamp >= TIMESTAMP(DATE(@windowStart))
        AND timestamp < TIMESTAMP(DATE_ADD(DATE(@windowEnd), INTERVAL 1 DAY))
    )
    WHERE rn = 1
  ),
  days AS (
    SELECT day
    FROM UNNEST(GENERATE_DATE_ARRAY(DATE(@windowStart), DATE(@windowEnd))) AS day
  ),
  items AS (
    SELECT * FROM all_dedup
    WHERE IFNULL(deleted, FALSE) = FALSE
      AND IFNULL(dead, FALSE) = FALSE
  ),
  daily_dead AS (
    SELECT
      DATE(timestamp) AS day,
      COUNT(*) AS total,
      COUNTIF(IFNULL(deleted, FALSE) OR IFNULL(dead, FALSE)) AS bad
    FROM all_dedup
    GROUP BY day
  ),
  daily_main AS (
    SELECT
      DATE(timestamp) AS day,
      COUNTIF(type IN ('story', 'poll', 'pollopt')) AS stories,
      COUNTIF(type = 'comment') AS comments,
      COUNT(DISTINCT IF(type = 'comment', author, NULL)) AS active_commenters,
      COUNT(DISTINCT IF(type IN ('story', 'poll', 'pollopt'), author, NULL)) AS active_submitters,
      APPROX_QUANTILES(IF(type IN ('story', 'poll', 'pollopt'), score, NULL), 100 IGNORE NULLS)[OFFSET(50)] AS median_score,
      APPROX_QUANTILES(IF(type IN ('story', 'poll', 'pollopt'), score, NULL), 100 IGNORE NULLS)[OFFSET(90)] AS p90_score,
      COUNTIF(type IN ('story', 'poll', 'pollopt') AND score >= 100) AS stories_gte100,
      COUNTIF(type = 'story' AND title LIKE 'Show HN:%') AS show_hn,
      COUNTIF(type = 'story' AND title LIKE 'Ask HN:%') AS ask_hn,
      COUNTIF(type = 'job') AS jobs
    FROM items
    GROUP BY day
  ),
  domain_counts AS (
    SELECT day, name, COUNT(*) AS stories
    FROM (
      SELECT DATE(timestamp) AS day, LOWER(NET.REG_DOMAIN(url)) AS name
      FROM items
      WHERE type IN ('story', 'poll', 'pollopt')
        AND url IS NOT NULL
    )
    WHERE name IS NOT NULL
    GROUP BY day, name
  ),
  domain_ranked AS (
    SELECT
      day,
      name,
      stories,
      SAFE_DIVIDE(stories, SUM(stories) OVER (PARTITION BY day)) AS share,
      ROW_NUMBER() OVER (PARTITION BY day ORDER BY stories DESC, name ASC) AS rn
    FROM domain_counts
  ),
  domains_by_day AS (
    SELECT
      day,
      ARRAY_AGG(STRUCT(name, stories, share) ORDER BY stories DESC, name ASC) AS top_domains
    FROM domain_ranked
    WHERE rn <= 10
    GROUP BY day
  )
SELECT
  FORMAT_DATE('%F', d.day) AS day,
  IFNULL(m.stories, 0) AS stories,
  IFNULL(m.comments, 0) AS comments,
  IFNULL(m.active_commenters, 0) AS active_commenters,
  IFNULL(m.active_submitters, 0) AS active_submitters,
  IFNULL(m.median_score, 0) AS median_score,
  IFNULL(m.p90_score, 0) AS p90_score,
  IFNULL(SAFE_DIVIDE(m.comments, m.stories), 0) AS comments_per_story,
  IFNULL(SAFE_DIVIDE(m.stories_gte100, m.stories), 0) AS success_rate_gte100,
  IFNULL(m.show_hn, 0) AS show_hn,
  IFNULL(m.ask_hn, 0) AS ask_hn,
  IFNULL(m.jobs, 0) AS jobs,
  IFNULL(SAFE_DIVIDE(dd.bad, dd.total), 0) AS dead_flagged_ratio,
  IFNULL(db.top_domains, ARRAY<STRUCT<name STRING, stories INT64, share FLOAT64>>[]) AS top_domains
FROM days d
LEFT JOIN daily_main m ON m.day = d.day
LEFT JOIN daily_dead dd ON dd.day = d.day
LEFT JOIN domains_by_day db ON db.day = d.day
ORDER BY d.day ASC;
`;

const topDomainsForDay = (row: BqAggregateRow | undefined): readonly TopDomainEntry[] =>
  row?.top_domains ?? [];

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
  };
};
