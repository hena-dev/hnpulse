import type { KpisJson } from "../schema/kpis.ts";
import { type MetaJson, MetaJsonSchema } from "../schema/meta.ts";

export interface BuildMetaArgs {
  kpis: KpisJson;
  kpisFile: string;
  buildSha: string;
  pipelineVersion: string;
  lastUpdated: Date;
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
  };
  return MetaJsonSchema.parse(meta);
};
