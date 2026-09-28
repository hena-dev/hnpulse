import type { BqClient } from "../bq/types.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import type { HnApiClient } from "../hn-api/types.ts";
import type { ReleaseManager } from "../release/types.ts";

export interface OrchestratorDeps {
  bq: BqClient;
  hnApi?: HnApiClient;
  release: ReleaseManager;
  duckdb: DuckdbRunner;
}

export interface OrchestratorConfig {
  /** Hard cap per BQ query, in bytes (§12). */
  maxBytesBilled: number;
  /** Where intermediate ndjson + parquet files live during a run. */
  tmpDir: string;
  /** `web/public/data/`-equivalent directory where kpis + meta JSON land. */
  dataOutDir: string;
  /** Git SHA of the producing commit. */
  buildSha: string;
  /** Pipeline package version, surfaced in meta.json. */
  pipelineVersion: string;
  /** "Now" — injected for deterministic testing. */
  now: Date;
  /** Maximum displayed period (default 730). New feeds retain up to two periods for comparisons. */
  windowDays?: number;
  /** Legacy compatibility option; archived raw days are retained permanently. */
  retentionDays?: number;
  /** Recent closed days are rewritten daily before becoming immutable (default 7). */
  stabilizationDays?: number;
  /** First selectable reference date (production default 2025-01-01). */
  snapshotFirst?: string;
  /** Permanent raw archive start (production default 2023-01-01). */
  archiveFirst?: string;
  /** Maximum remote parquet uploads per run (default 400). */
  uploadCap?: number;
  /** Read remote inputs, but never upload or delete remote assets. */
  dryRun?: boolean;
  /** Existing published data to reuse when writing a dry-run output elsewhere. */
  existingDataDir?: string;
}

export interface OrchestratorResult {
  status: "completed" | "stale-source" | "invalid-source" | "incomplete-source" | "no-rows";
  message: string;
  kpisFile?: string;
  rowsExtracted?: number;
  filesUploaded?: number;
  filesDeleted?: number;
}
