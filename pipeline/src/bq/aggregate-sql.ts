export const buildBqAggregateSql = (): string => `
WITH
  all_dedup AS (
    SELECT * EXCEPT(rn) FROM (
      SELECT id, type, \`by\` AS author, title, url, score, timestamp, dead, deleted,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY timestamp DESC) AS rn
      FROM \`bigquery-public-data.hacker_news.full\`
      WHERE timestamp >= TIMESTAMP(DATE(@windowStart))
        AND timestamp < TIMESTAMP(DATE_ADD(DATE(@windowEnd), INTERVAL 1 DAY))
    )
    WHERE rn = 1
  ),
  days AS (
    SELECT day FROM UNNEST(GENERATE_DATE_ARRAY(DATE(@windowStart), DATE(@windowEnd))) AS day
  ),
  items AS (
    SELECT * FROM all_dedup WHERE IFNULL(deleted, FALSE) = FALSE AND IFNULL(dead, FALSE) = FALSE
  ),
  daily_dead AS (
    SELECT DATE(timestamp) AS day, COUNT(*) AS total,
      COUNTIF(IFNULL(deleted, FALSE) OR IFNULL(dead, FALSE)) AS bad
    FROM all_dedup GROUP BY day
  ),
  daily_main AS (
    SELECT DATE(timestamp) AS day,
      COUNTIF(type = 'story') AS stories,
      COUNTIF(type = 'comment') AS comments,
      COUNT(DISTINCT IF(type = 'comment', author, NULL)) AS active_commenters,
      COUNT(DISTINCT IF(type = 'story', author, NULL)) AS active_submitters,
      APPROX_QUANTILES(IF(type = 'story', score, NULL), 100 IGNORE NULLS)[OFFSET(50)] AS median_score,
      APPROX_QUANTILES(IF(type = 'story', score, NULL), 100 IGNORE NULLS)[OFFSET(90)] AS p90_score,
      COUNTIF(type = 'story' AND score >= 100) AS stories_gte100,
      COUNTIF(type = 'story' AND title LIKE 'Show HN:%') AS show_hn,
      COUNTIF(type = 'story' AND title LIKE 'Ask HN:%') AS ask_hn,
      COUNTIF(type = 'job') AS jobs
    FROM items GROUP BY day
  ),
  domain_base AS (
    SELECT DATE(timestamp) AS day, LOWER(NET.REG_DOMAIN(url)) AS name
    FROM items WHERE type = 'story' AND url IS NOT NULL
  ),
  domain_counts AS (
    SELECT day, name, COUNT(*) AS stories FROM domain_base
    WHERE name IS NOT NULL GROUP BY day, name
  ),
  daily_domain_shares AS (
    -- Shares are within story links that resolve to a registrable domain.
    SELECT day, name, stories,
      SAFE_DIVIDE(stories, SUM(stories) OVER (PARTITION BY day)) AS share
    FROM domain_counts
  ),
  domains_by_day AS (
    SELECT day,
      ARRAY_AGG(STRUCT(name AS name, stories AS stories, share AS share) ORDER BY stories DESC, name ASC LIMIT 10) AS top_domains
    FROM daily_domain_shares GROUP BY day
  ),
  range_specs AS (
    SELECT * FROM UNNEST([
      STRUCT('1w' AS range_id, 7 AS days), STRUCT('1m' AS range_id, 30 AS days),
      STRUCT('3m' AS range_id, 90 AS days), STRUCT('6m' AS range_id, 180 AS days),
      STRUCT('1y' AS range_id, 365 AS days), STRUCT('2y' AS range_id, 730 AS days)
    ])
  ),
  range_domain_counts AS (
    SELECT rs.range_id, db.name, COUNT(*) AS stories
    FROM range_specs rs JOIN domain_base db
      ON db.name IS NOT NULL
     AND db.day >= DATE_SUB(DATE(@windowEnd), INTERVAL (rs.days - 1) DAY)
     AND db.day <= DATE(@windowEnd)
    GROUP BY rs.range_id, db.name
  ),
  range_domain_shares AS (
    -- Shares are within story links that resolve to a registrable domain.
    SELECT range_id, name, stories,
      SAFE_DIVIDE(stories, SUM(stories) OVER (PARTITION BY range_id)) AS share
    FROM range_domain_counts
  ),
  range_domains AS (
    SELECT ARRAY_AGG(STRUCT(range_id AS range_id, domains AS domains) ORDER BY range_id) AS top_domains_by_range
    FROM (
      SELECT range_id,
        ARRAY_AGG(STRUCT(name AS name, stories AS stories, share AS share) ORDER BY stories DESC, name ASC LIMIT 10) AS domains
      FROM range_domain_shares GROUP BY range_id
    )
  )
SELECT FORMAT_DATE('%F', d.day) AS day,
  IFNULL(m.stories, 0) AS stories, IFNULL(m.comments, 0) AS comments,
  IFNULL(m.active_commenters, 0) AS active_commenters,
  IFNULL(m.active_submitters, 0) AS active_submitters,
  IFNULL(m.median_score, 0) AS median_score, IFNULL(m.p90_score, 0) AS p90_score,
  IFNULL(SAFE_DIVIDE(m.comments, m.stories), 0) AS comments_per_story,
  IFNULL(SAFE_DIVIDE(m.stories_gte100, m.stories), 0) AS success_rate_gte100,
  IFNULL(m.show_hn, 0) AS show_hn, IFNULL(m.ask_hn, 0) AS ask_hn, IFNULL(m.jobs, 0) AS jobs,
  IFNULL(SAFE_DIVIDE(dd.bad, dd.total), 0) AS dead_flagged_ratio,
  IFNULL(dd.total, 0) AS dead_flagged_total,
  IFNULL(db.top_domains, ARRAY<STRUCT<name STRING, stories INT64, share FLOAT64>>[]) AS top_domains,
  rd.top_domains_by_range AS top_domains_by_range
FROM days d
LEFT JOIN daily_main m ON m.day = d.day
LEFT JOIN daily_dead dd ON dd.day = d.day
LEFT JOIN domains_by_day db ON db.day = d.day
CROSS JOIN range_domains rd
ORDER BY d.day ASC;
`;
