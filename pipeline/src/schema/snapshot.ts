import { z } from "zod";
import { parseUtcDay } from "../dates/utc-day.ts";
import { TopDomainsByRangeSchema } from "./kpis.ts";
import { METRIC_KEYS, MetricSeriesSchema } from "./metrics.ts";

const day = z.string().refine((value) => {
  try {
    parseUtcDay(value);
    return true;
  } catch {
    return false;
  }
}, "expected valid YYYY-MM-DD");

export const SnapshotJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    windowStart: day,
    windowEnd: day,
    metrics: MetricSeriesSchema,
    topDomainsByRange: TopDomainsByRangeSchema,
    lastUpdated: z.iso.datetime(),
    status: z.enum(["final", "provisional"]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const count = (Date.parse(value.windowEnd) - Date.parse(value.windowStart)) / 86_400_000 + 1;
    if (count < 1 || METRIC_KEYS.some((key) => value.metrics[key].length !== count)) {
      ctx.addIssue({ code: "custom", message: "invalid snapshot window/metric lengths" });
    }
    if (value.metrics.stories.some((n) => n <= 0)) {
      ctx.addIssue({ code: "custom", message: "snapshot contains an empty story day" });
    }
  });

export type SnapshotJson = z.infer<typeof SnapshotJsonSchema>;
