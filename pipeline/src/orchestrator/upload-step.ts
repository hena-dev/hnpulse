import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildNdjsonToParquetSql } from "../duckdb/sql-templates.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import { type NdjsonByDayFile, writeNdjsonByDay } from "../parquet/write-by-day.ts";
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
  uploadCap?: number;
  dryRun?: boolean;
  refreshFrom?: string;
}

export interface UploadStepResult {
  uploaded: readonly string[];
  deleted: readonly string[];
  localFiles: ReadonlyMap<string, string>;
}

export interface UploadNdjsonStepArgs {
  ndjsons: readonly NdjsonByDayFile[];
  tmpDir: string;
  release: ReleaseManager;
  duckdb: DuckdbRunner;
  now: Date;
  retentionDays: number;
  existingAssets: readonly ReleaseAsset[];
  uploadCap?: number;
  dryRun?: boolean;
  refreshFrom?: string;
}

export const runUploadNdjsonStep = async (
  args: UploadNdjsonStepArgs,
): Promise<UploadStepResult> => {
  const parquetDir = join(args.tmpDir, "parquet");
  await mkdir(parquetDir, { recursive: true });

  const existingNames = new Set(args.existingAssets.map((a) => a.name));
  const deleted = new Set<string>();
  const uploaded: string[] = [];
  const localFiles = new Map<string, string>();
  const cap = args.uploadCap ?? 400;
  if (!Number.isInteger(cap) || cap < 0) throw new Error("uploadCap must be a nonnegative integer");

  const ordered = [...args.ndjsons].sort((a, b) => {
    const priority = (day: string): number => Number(day >= (args.refreshFrom ?? "9999-12-31"));
    return priority(b.day) - priority(a.day) || a.day.localeCompare(b.day);
  });
  for (const f of ordered) {
    const parquetPath = join(parquetDir, `items-${f.day}.parquet`);
    await args.duckdb.execute(buildNdjsonToParquetSql({ ndjsonPath: f.path, parquetPath }));
    const assetName = `items-${f.day}.parquet`;
    localFiles.set(assetName, parquetPath);
    if (args.dryRun || uploaded.length >= cap) continue;
    if (existingNames.has(assetName)) {
      await args.release.deleteAsset(assetName);
      deleted.add(assetName);
    }
    await args.release.uploadAsset(assetName, parquetPath, "application/octet-stream");
    uploaded.push(assetName);
  }

  return { uploaded, deleted: [...deleted], localFiles };
};

export const runUploadStep = async (args: UploadStepArgs): Promise<UploadStepResult> => {
  const ndjsonDir = join(args.tmpDir, "ndjson");
  const ndjsons = await writeNdjsonByDay(args.rows, ndjsonDir);
  return runUploadNdjsonStep({ ...args, ndjsons });
};
