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
  /** Optional window size override (default 730 = trailing 2y). */
  windowDays?: number;
  /** Optional retention override (default 730). */
  retentionDays?: number;
  /** Recent closed days are rewritten daily before becoming immutable (default 7). */
  stabilizationDays?: number;
}

export interface OrchestratorResult {
  status: "completed" | "stale-source" | "invalid-source" | "incomplete-source" | "no-rows";
  message: string;
  kpisFile?: string;
  rowsExtracted?: number;
  filesUploaded?: number;
  filesDeleted?: number;
}
