import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { KpisJson } from "../schema/kpis.ts";
import { KpisJsonSchema } from "../schema/kpis.ts";
import type { MetaJson } from "../schema/meta.ts";
import { buildMeta } from "./build-meta.ts";
import { kpisFilenameFor } from "./hash.ts";

export interface WriteDataArgs {
  outDir: string;
  kpis: KpisJson;
  buildSha: string;
  pipelineVersion: string;
  now: Date;
}

export interface WriteDataResult {
  kpisFile: string;
  meta: MetaJson;
}

export const writeData = async (args: WriteDataArgs): Promise<WriteDataResult> => {
  const validated = KpisJsonSchema.parse(args.kpis);
  await mkdir(args.outDir, { recursive: true });

  const kpisJson = JSON.stringify(validated);
  const kpisFile = kpisFilenameFor(kpisJson);
  const baseName = kpisFile.slice("/data/".length);

  await writeFile(join(args.outDir, baseName), kpisJson, "utf8");
  await writeFile(join(args.outDir, "kpis-current.json"), kpisJson, "utf8");

  const meta = buildMeta({
    kpis: validated,
    kpisFile,
    buildSha: args.buildSha,
    pipelineVersion: args.pipelineVersion,
    lastUpdated: args.now,
  });
  await writeFile(join(args.outDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  return { kpisFile, meta };
};
