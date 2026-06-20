import { z } from "zod";
import { METRIC_KEYS, MetricSeriesSchema } from "./metrics.ts";
import { RANGE_IDS, type RangeId } from "./range.ts";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const TopDomainEntrySchema = z.object({
  name: z.string().min(1),
  stories: z.number().int().nonnegative(),
  // Share among story links that resolve to a registrable domain.
  share: z.number().min(0).max(1),
});

export const TopDomainsDaySchema = z.object({
  date: dateString,
  domains: z.array(TopDomainEntrySchema).max(10),
});

const topDomainsByRangeShape = Object.fromEntries(
  RANGE_IDS.map((id) => [id, z.array(TopDomainEntrySchema).max(10)] as const),
) as Record<RangeId, z.ZodArray<typeof TopDomainEntrySchema>>;

export const TopDomainsByRangeSchema = z.object(topDomainsByRangeShape);

export const KpisJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    windowStart: dateString,
    windowEnd: dateString,
    days: z.array(dateString).min(1),
    metrics: MetricSeriesSchema,
    topDomainsByDay: z.array(TopDomainsDaySchema),
    topDomainsByRange: TopDomainsByRangeSchema,
  })
  .superRefine((v, ctx) => {
    const expected = v.days.length;
    for (const k of METRIC_KEYS) {
      const series = v.metrics[k];
      if (series.length !== expected) {
        ctx.addIssue({
          code: "custom",
          path: ["metrics", k],
          message: `expected ${expected} values, got ${series.length}`,
        });
      }
    }
    if (v.topDomainsByDay.length !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["topDomainsByDay"],
        message: `expected ${expected} entries, got ${v.topDomainsByDay.length}`,
      });
    }
  });

export type KpisJson = z.infer<typeof KpisJsonSchema>;
export type TopDomainEntry = z.infer<typeof TopDomainEntrySchema>;
export type TopDomainsDay = z.infer<typeof TopDomainsDaySchema>;
export type TopDomainsByRange = z.infer<typeof TopDomainsByRangeSchema>;
