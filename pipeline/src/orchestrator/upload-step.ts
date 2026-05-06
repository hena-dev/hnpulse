import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildNdjsonToParquetSql } from "../duckdb/sql-templates.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import { writeNdjsonByDay } from "../parquet/write-by-day.ts";
import { pickAssetsToDelete } from "../release/policy.ts";
import type { ReleaseAsset, ReleaseManager } from "../release/types.ts";
import type { BqRow } from "../schema/bq-row.ts";

export interface UploadStepArgs {
  rows: readonly BqRow[];
  tmpDir: string;
  release: ReleaseManager;
  duckdb: DuckdbRunner;
  now: Date;
  retentionDays: number;
  existingAssets: readonly ReleaseAsset[];
}

export interface UploadStepResult {
  uploaded: readonly string[];
  deleted: readonly string[];
}

export const runUploadStep = async (args: UploadStepArgs): Promise<UploadStepResult> => {
  const ndjsonDir = join(args.tmpDir, "ndjson");
  const parquetDir = join(args.tmpDir, "parquet");
  await mkdir(parquetDir, { recursive: true });

  const ndjsons = await writeNdjsonByDay(args.rows, ndjsonDir);
  const uploaded: string[] = [];
  for (const f of ndjsons) {
    const parquetPath = join(parquetDir, `items-${f.day}.parquet`);
    await args.duckdb.execute(buildNdjsonToParquetSql({ ndjsonPath: f.path, parquetPath }));
    const assetName = `items-${f.day}.parquet`;
    await args.release.uploadAsset(assetName, parquetPath, "application/octet-stream");
    uploaded.push(assetName);
  }

  const stale = pickAssetsToDelete(args.existingAssets, args.now, args.retentionDays);
  for (const name of stale) await args.release.deleteAsset(name);

  return { uploaded, deleted: stale };
};
