import { z } from "zod";
import { RANGE_IDS } from "../lib/range/range.ts";
import type { KpisJson, MetaJson, MetricKey } from "./types.ts";
import { METRIC_KEYS } from "./types.ts";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const finite = z.number().refine(Number.isFinite);

const series = z.object(
  Object.fromEntries(
    METRIC_KEYS.map(
      (k) => [k, k === "deadFlaggedTotal" ? z.array(finite).optional() : z.array(finite)] as const,
    ),
  ),
);

const TopDomain = z.object({
  name: z.string().min(1),
  stories: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const TopDomainsDay = z.object({
  date,
  domains: z.array(TopDomain).max(10),
});

const TopDomainsByRange = z.object(
  Object.fromEntries(RANGE_IDS.map((id) => [id, z.array(TopDomain).max(10)] as const)),
);

export const KpisJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    windowStart: date,
    windowEnd: date,
    days: z.array(date).min(1),
    metrics: series,
    topDomainsByDay: z.array(TopDomainsDay),
    topDomainsByRange: TopDomainsByRange,
  })
  .superRefine((v, ctx) => {
    const n = v.days.length;
    const metrics = v.metrics as Record<string, readonly number[] | undefined>;
    for (const k of METRIC_KEYS) {
      const len = metrics[k]?.length;
      if (len === undefined) continue;
      if (len !== n) {
        ctx.addIssue({
          code: "custom",
          path: ["metrics", k],
          message: `expected ${n}, got ${len}`,
        });
      }
    }
    if (v.topDomainsByDay.length !== n) {
      ctx.addIssue({ code: "custom", path: ["topDomainsByDay"], message: `expected ${n}` });
    }
  })
  .transform((v) => {
    type ParsedMetrics = Record<MetricKey, number[]> & { deadFlaggedTotal?: number[] };
    const metrics = v.metrics as ParsedMetrics;
    return {
      ...v,
      metrics: {
        ...metrics,
        // Legacy checked-in KPI files predate the exact denominator series.
        deadFlaggedTotal:
          metrics.deadFlaggedTotal ??
          metrics.stories.map(
            (stories, i) => stories + (metrics.comments[i] ?? 0) + (metrics.jobs[i] ?? 0),
          ),
      },
    };
  });

export const MetaJsonSchema = z.object({
  schemaVersion: z.literal(1),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/),
  dataAsOf: date,
  windowStart: date,
  windowEnd: date,
  kpisFile: z.string().regex(/^\/data\/kpis\.[a-f0-9]+\.json$/),
  buildSha: z.string().min(1),
  pipelineVersion: z.string().min(1),
  dataSources: z.array(z.enum(["bigquery", "hacker-news-api"])).min(1),
  stabilizationDays: z.number().int().positive(),
  provisionalFrom: date,
});

export const parseKpis = (raw: unknown): KpisJson =>
  KpisJsonSchema.parse(raw) as unknown as KpisJson;
export const parseMeta = (raw: unknown): MetaJson =>
  MetaJsonSchema.parse(raw) as unknown as MetaJson;
