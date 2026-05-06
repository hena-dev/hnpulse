import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assembleKpisJson, type DailyRow, type DomainRow } from "../aggregate/assemble.ts";
import { buildDailyMetricsSql, buildDomainRowsSql } from "../aggregate/sql.ts";
import { enumerateUtcDays, parseUtcDay } from "../dates/utc-day.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import { pickParquetAssets } from "../release/policy.ts";
import type { ReleaseAsset, ReleaseManager } from "../release/types.ts";
import type { KpisJson } from "../schema/kpis.ts";

export interface AggregateStepArgs {
  release: ReleaseManager;
  duckdb: DuckdbRunner;
  tmpDir: string;
  windowStart: string;
  windowEnd: string;
  /** Asset names already known; we'll download every parquet asset. */
  assets: readonly ReleaseAsset[];
}

export const downloadAllParquet = async (
  release: ReleaseManager,
  assets: readonly ReleaseAsset[],
  destDir: string,
): Promise<readonly string[]> => {
  await mkdir(destDir, { recursive: true });
  const parquets = pickParquetAssets(assets);
  const files: string[] = [];
  for (const a of parquets) {
    const localPath = join(destDir, a.name);
    await release.downloadAsset(a.name, localPath);
    files.push(localPath);
  }
  return files;
};

export const runAggregateStep = async (args: AggregateStepArgs): Promise<KpisJson> => {
  const localDir = join(args.tmpDir, "parquet-local");
  await downloadAllParquet(args.release, args.assets, localDir);
  const glob = join(localDir, "items-*.parquet");

  const dailyRows = await args.duckdb.queryJson<DailyRow>(
    buildDailyMetricsSql({
      parquetGlob: glob,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    }),
  );
  const domainRows = await args.duckdb.queryJson<DomainRow>(
    buildDomainRowsSql({
      parquetGlob: glob,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    }),
  );
  const days = enumerateUtcDays(parseUtcDay(args.windowStart), parseUtcDay(args.windowEnd));
  return assembleKpisJson({ days, dailyRows, domainRows });
};
