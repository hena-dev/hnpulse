import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const isoUtcString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, "expected ISO-8601 UTC");
const kpisPath = z
  .string()
  .regex(/^\/data\/kpis\.[a-f0-9]+\.json$/, "expected /data/kpis.<sha>.json");

export const DataSourceSchema = z.enum(["bigquery", "hacker-news-api"]);

export const MetaJsonSchema = z.object({
  schemaVersion: z.literal(1),
  lastUpdated: isoUtcString,
  dataAsOf: dateString,
  windowStart: dateString,
  windowEnd: dateString,
  kpisFile: kpisPath,
  buildSha: z.string().min(1),
  pipelineVersion: z.string().min(1),
  dataSources: z.array(DataSourceSchema).min(1),
  stabilizationDays: z.number().int().positive(),
  provisionalFrom: dateString,
});

export type MetaJson = z.infer<typeof MetaJsonSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
