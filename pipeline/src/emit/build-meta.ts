import type { KpisJson } from "../schema/kpis.ts";
import { type DataSource, type MetaJson, MetaJsonSchema } from "../schema/meta.ts";

export interface BuildMetaArgs {
  kpis: KpisJson;
  kpisFile: string;
  buildSha: string;
  pipelineVersion: string;
  lastUpdated: Date;
  dataSources: readonly DataSource[];
  stabilizationDays: number;
  provisionalFrom: string;
}

export const buildMeta = (args: BuildMetaArgs): MetaJson => {
  const meta: MetaJson = {
    schemaVersion: 1,
    lastUpdated: args.lastUpdated.toISOString(),
    dataAsOf: args.kpis.windowEnd,
    windowStart: args.kpis.windowStart,
    windowEnd: args.kpis.windowEnd,
    kpisFile: args.kpisFile,
    buildSha: args.buildSha,
    pipelineVersion: args.pipelineVersion,
    dataSources: [...args.dataSources],
    stabilizationDays: args.stabilizationDays,
    provisionalFrom: args.provisionalFrom,
  };
  return MetaJsonSchema.parse(meta);
};
