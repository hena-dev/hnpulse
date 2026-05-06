import { parseUtcDay } from "../dates/utc-day.ts";

export interface SqlBuildArgs {
  parquetGlob: string;
  windowStart: string;
  windowEnd: string;
}

const escapeSqlLiteral = (s: string): string => s.replace(/'/g, "''");

const validateArgs = (
  args: SqlBuildArgs,
): { start: string; endExclusive: string; glob: string } => {
  parseUtcDay(args.windowStart);
  const end = parseUtcDay(args.windowEnd);
  const endExclusive = new Date(end.getTime() + 86_400_000).toISOString().slice(0, 10);
  return {
    start: args.windowStart,
    endExclusive,
    glob: escapeSqlLiteral(args.parquetGlob),
  };
};

const dedupCte = (glob: string, start: string, endExclusive: string): string => `
  all_dedup AS (
    SELECT * FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) AS rn
      FROM read_parquet('${glob}')
      WHERE timestamp >= TIMESTAMP '${start} 00:00:00'
        AND timestamp <  TIMESTAMP '${endExclusive} 00:00:00'
    ) t WHERE rn = 1
  )`;

const daysCte = (start: string, endExclusive: string): string => `
  days AS (
    SELECT (range)::DATE AS d
    FROM range(DATE '${start}', DATE '${endExclusive}', INTERVAL 1 DAY)
  )`;

const dailyCtes = (): string => `
  items AS (
    SELECT * FROM all_dedup
    WHERE coalesce(deleted, false) = false
      AND coalesce(dead, false) = false
  ),
  daily_dead AS (
    SELECT timestamp::DATE AS day,
           COUNT(*) AS total,
           COUNT(*) FILTER (
             WHERE coalesce(deleted, false) OR coalesce(dead, false)
           ) AS bad
    FROM all_dedup GROUP BY 1
  ),
  daily_main AS (
    SELECT timestamp::DATE AS day,
      COUNT(*) FILTER (WHERE type IN ('story','poll','pollopt')) AS stories,
      COUNT(*) FILTER (WHERE type = 'comment') AS comments,
      COUNT(DISTINCT by) FILTER (WHERE type = 'comment') AS active_commenters,
      COUNT(DISTINCT by) FILTER (WHERE type IN ('story','poll','pollopt')) AS active_submitters,
      APPROX_QUANTILE(score, 0.50) FILTER (WHERE type IN ('story','poll','pollopt')) AS median_score,
      APPROX_QUANTILE(score, 0.90) FILTER (WHERE type IN ('story','poll','pollopt')) AS p90_score,
      COUNT(*) FILTER (
        WHERE type IN ('story','poll','pollopt') AND score >= 100
      ) AS stories_gte100,
      COUNT(*) FILTER (WHERE type = 'story' AND title LIKE 'Show HN:%') AS show_hn,
      COUNT(*) FILTER (WHERE type = 'story' AND title LIKE 'Ask HN:%') AS ask_hn,
      COUNT(*) FILTER (WHERE type = 'job') AS jobs
    FROM items GROUP BY 1
  )`;

const dailySelect = (): string => `
SELECT
  d::VARCHAR AS day,
  coalesce(m.stories, 0)::BIGINT            AS stories,
  coalesce(m.comments, 0)::BIGINT           AS comments,
  coalesce(m.active_commenters, 0)::BIGINT  AS active_commenters,
  coalesce(m.active_submitters, 0)::BIGINT  AS active_submitters,
  coalesce(m.median_score, 0)::DOUBLE       AS median_score,
  coalesce(m.p90_score, 0)::DOUBLE          AS p90_score,
  CASE WHEN coalesce(m.stories, 0) > 0
       THEN m.comments::DOUBLE / m.stories ELSE 0 END  AS comments_per_story,
  CASE WHEN coalesce(m.stories, 0) > 0
       THEN m.stories_gte100::DOUBLE / m.stories ELSE 0 END  AS success_rate_gte100,
  coalesce(m.show_hn, 0)::BIGINT  AS show_hn,
  coalesce(m.ask_hn, 0)::BIGINT   AS ask_hn,
  coalesce(m.jobs, 0)::BIGINT     AS jobs,
  CASE WHEN coalesce(dd.total, 0) > 0
       THEN dd.bad::DOUBLE / dd.total ELSE 0 END  AS dead_flagged_ratio
FROM days
LEFT JOIN daily_main m  ON m.day  = d
LEFT JOIN daily_dead dd ON dd.day = d
ORDER BY d ASC`;

export const buildDailyMetricsSql = (args: SqlBuildArgs): string => {
  const { start, endExclusive, glob } = validateArgs(args);
  return `WITH${dedupCte(glob, start, endExclusive)},${daysCte(start, endExclusive)},${dailyCtes()}${dailySelect()};`;
};

export const buildDomainRowsSql = (args: SqlBuildArgs): string => {
  const { start, endExclusive, glob } = validateArgs(args);
  return `WITH${dedupCte(glob, start, endExclusive)}
SELECT timestamp::DATE::VARCHAR AS day, url
FROM all_dedup
WHERE coalesce(deleted, false) = false
  AND coalesce(dead, false) = false
  AND type IN ('story','poll','pollopt')
  AND url IS NOT NULL
ORDER BY day ASC;`;
};
