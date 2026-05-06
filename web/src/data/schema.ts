import { z } from "zod";
import type { KpisJson, MetaJson } from "./types.ts";
import { METRIC_KEYS } from "./types.ts";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const finite = z.number().refine(Number.isFinite);

const series = z.object(Object.fromEntries(METRIC_KEYS.map((k) => [k, z.array(finite)] as const)));

const TopDomain = z.object({
  name: z.string().min(1),
  stories: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const TopDomainsDay = z.object({
  date,
  domains: z.array(TopDomain).max(10),
});

export const KpisJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    windowStart: date,
    windowEnd: date,
    days: z.array(date).min(1),
    metrics: series,
    topDomainsByDay: z.array(TopDomainsDay),
  })
  .superRefine((v, ctx) => {
    const n = v.days.length;
    const metrics = v.metrics as Record<string, readonly number[]>;
    for (const k of METRIC_KEYS) {
      const len = (metrics[k] as readonly number[]).length;
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
});

export const parseKpis = (raw: unknown): KpisJson =>
  KpisJsonSchema.parse(raw) as unknown as KpisJson;
export const parseMeta = (raw: unknown): MetaJson =>
  MetaJsonSchema.parse(raw) as unknown as MetaJson;
