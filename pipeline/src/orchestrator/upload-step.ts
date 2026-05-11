import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildNdjsonToParquetSql } from "../duckdb/sql-templates.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import { type NdjsonByDayFile, writeNdjsonByDay } from "../parquet/write-by-day.ts";
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

export interface UploadNdjsonStepArgs {
  ndjsons: readonly NdjsonByDayFile[];
  tmpDir: string;
  release: ReleaseManager;
  duckdb: DuckdbRunner;
  now: Date;
  retentionDays: number;
  existingAssets: readonly ReleaseAsset[];
}

export const runUploadNdjsonStep = async (
  args: UploadNdjsonStepArgs,
): Promise<UploadStepResult> => {
  const parquetDir = join(args.tmpDir, "parquet");
  await mkdir(parquetDir, { recursive: true });

  const existingNames = new Set(args.existingAssets.map((a) => a.name));
  const deleted = new Set<string>();
  const uploaded: string[] = [];

  for (const f of args.ndjsons) {
    const parquetPath = join(parquetDir, `items-${f.day}.parquet`);
    await args.duckdb.execute(buildNdjsonToParquetSql({ ndjsonPath: f.path, parquetPath }));
    const assetName = `items-${f.day}.parquet`;
    if (existingNames.has(assetName)) {
      await args.release.deleteAsset(assetName);
      deleted.add(assetName);
    }
    await args.release.uploadAsset(assetName, parquetPath, "application/octet-stream");
    uploaded.push(assetName);
  }

  const stale = pickAssetsToDelete(args.existingAssets, args.now, args.retentionDays);
  for (const name of stale) {
    if (deleted.has(name)) continue;
    await args.release.deleteAsset(name);
    deleted.add(name);
  }

  return { uploaded, deleted: [...deleted] };
};

export const runUploadStep = async (args: UploadStepArgs): Promise<UploadStepResult> => {
  const ndjsonDir = join(args.tmpDir, "ndjson");
  const ndjsons = await writeNdjsonByDay(args.rows, ndjsonDir);
  return runUploadNdjsonStep({ ...args, ndjsons });
};
