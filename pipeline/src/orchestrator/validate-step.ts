import { formatUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import type { KpisJson } from "../schema/kpis.ts";
import { KpisJsonSchema } from "../schema/kpis.ts";
import { type MetricSeries, MetricSeriesSchema } from "../schema/metrics.ts";
import { findEmptyDays } from "../validate/coverage.ts";
import { findOutliers } from "../validate/outliers.ts";

export const validatePublication = (
  latest: KpisJson,
  days: readonly string[],
  metrics: MetricSeries,
  now: Date,
): string | null => {
  KpisJsonSchema.parse(latest);
  MetricSeriesSchema.parse(metrics);
  const expectedEnd = formatUtcDay(new Date(startOfUtcDay(now).getTime() - 86_400_000));
  if (latest.windowEnd !== expectedEnd)
    return `Validation failed (freshness): expected ${expectedEnd}`;
  const empty = findEmptyDays(days, metrics.stories);
  if (empty.length > 0) return `Validation failed (date coverage): empty day ${empty[0]}`;
  const { jobs: _jobs, ...stable } = latest.metrics;
  const outliers = findOutliers(stable);
  if (outliers.length > 0)
    return `Validation failed (10× rule): ${outliers.map((o) => o.metric).join(", ")}`;
  return null;
};
