import { z } from "zod";

export const METRIC_KEYS = [
  "stories",
  "comments",
  "activeCommenters",
  "activeSubmitters",
  "medianScore",
  "p90Score",
  "commentsPerStory",
  "successRateGte100",
  "showHn",
  "askHn",
  "jobs",
  "deadFlaggedRatio",
  "deadFlaggedTotal",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const MetricKeySchema = z.enum(METRIC_KEYS);

const finiteNumber = z.number().refine(Number.isFinite, { message: "must be finite" });

const seriesShape = Object.fromEntries(
  METRIC_KEYS.map((k) => [k, z.array(finiteNumber)] as const),
) as { [K in MetricKey]: z.ZodArray<z.ZodNumber> };

export const MetricSeriesSchema = z.object(seriesShape);

export type MetricSeries = z.infer<typeof MetricSeriesSchema>;
