import { join } from "node:path";
import { computeSinceTimestamp, extractRowsStream } from "../bq/extract.ts";
import { fetchMaxTimestamp, isFreshAsOf } from "../bq/freshness.ts";
import { formatUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import { writeData } from "../emit/write-data.ts";
import { writeNdjsonByDayFromRows } from "../parquet/write-by-day.ts";
import type { KpisJson } from "../schema/kpis.ts";
import { findEmptyDays } from "../validate/coverage.ts";
import { findOutliers } from "../validate/outliers.ts";
import { runAggregateStep } from "./aggregate-step.ts";
import { decideMode } from "./decide-mode.ts";
import type { OrchestratorConfig, OrchestratorDeps, OrchestratorResult } from "./types.ts";
import { runUploadNdjsonStep } from "./upload-step.ts";

const MS_PER_DAY = 86_400_000;
const DEFAULT_RETENTION_DAYS = 730;
const DEFAULT_WINDOW_DAYS = 730;

const computeWindow = (now: Date, windowDays: number): { start: string; end: string } => {
  const startOfToday = startOfUtcDay(now);
  const end = new Date(startOfToday.getTime() - MS_PER_DAY);
  const start = new Date(end.getTime() - (windowDays - 1) * MS_PER_DAY);
  return { start: formatUtcDay(start), end: formatUtcDay(end) };
};

const computeBootstrapSince = (now: Date, retentionDays: number): Date =>
  new Date(startOfUtcDay(now).getTime() - retentionDays * MS_PER_DAY);

const sumNdjsonRows = (files: readonly { rows: number }[]): number =>
  files.reduce((sum, file) => sum + file.rows, 0);

const buildSeriesForOutliers = (
  metrics: Readonly<Record<string, readonly number[]>>,
): Readonly<Record<string, readonly number[]>> => metrics;

const validateKpis = (kpis: KpisJson): string | null => {
  const outliers = findOutliers(buildSeriesForOutliers(kpis.metrics));
  if (outliers.length > 0) {
    return `Validation failed (10× rule): ${outliers.map((o) => `${o.metric}=${o.value} (median=${o.median}, ratio=${o.ratio})`).join("; ")}`;
  }

  const emptyDays = findEmptyDays(kpis.days, kpis.metrics.stories);
  if (emptyDays.length > 0) {
    return `Validation failed (date coverage): ${emptyDays.length} day(s) with 0 stories (first: ${emptyDays[0]})`;
  }
  return null;
};

const invalidSource = (message: string): OrchestratorResult => ({
  status: "invalid-source",
  message: `Skipped publish: ${message}`,
});

export const runOrchestrator = async (
  deps: OrchestratorDeps,
  cfg: OrchestratorConfig,
): Promise<OrchestratorResult> => {
  const maxTs = await fetchMaxTimestamp(deps.bq, { maxBytesBilled: cfg.maxBytesBilled });
  if (!isFreshAsOf(maxTs, cfg.now)) {
    return { status: "stale-source", message: `BQ MAX(timestamp)=${maxTs.toISOString()} is stale` };
  }

  const initialAssets = await deps.release.listAssets();
  const decision = decideMode(initialAssets);
  const window = computeWindow(cfg.now, cfg.windowDays ?? DEFAULT_WINDOW_DAYS);
  const retentionDays = cfg.retentionDays ?? DEFAULT_RETENTION_DAYS;

  const since =
    decision.mode === "bootstrap"
      ? computeBootstrapSince(cfg.now, retentionDays)
      : computeSinceTimestamp({
          mode: "incremental",
          now: cfg.now,
          lastMaxTs: decision.lastMaxTs,
        });
  const until = startOfUtcDay(cfg.now);
  if (decision.mode === "incremental" && since.getTime() >= until.getTime()) {
    return { status: "no-rows", message: "No new closed UTC day since last run", rowsExtracted: 0 };
  }
  const ndjsons = await writeNdjsonByDayFromRows(
    extractRowsStream(deps.bq, { since, until, maxBytesBilled: cfg.maxBytesBilled }),
    join(cfg.tmpDir, "ndjson"),
  );
  const rowsExtracted = sumNdjsonRows(ndjsons);

  if (rowsExtracted === 0) {
    return {
      status: "no-rows",
      message:
        decision.mode === "bootstrap"
          ? "No rows available to bootstrap"
          : "No new rows since last run",
      rowsExtracted: 0,
    };
  }

  const upload = await runUploadNdjsonStep({
    ndjsons,
    tmpDir: cfg.tmpDir,
    release: deps.release,
    duckdb: deps.duckdb,
    now: cfg.now,
    retentionDays,
    existingAssets: initialAssets,
  });

  const assetsAfter = await deps.release.listAssets();
  const kpis = await runAggregateStep({
    release: deps.release,
    duckdb: deps.duckdb,
    tmpDir: cfg.tmpDir,
    windowStart: window.start,
    windowEnd: window.end,
    assets: assetsAfter,
  });

  const validationFailure = validateKpis(kpis);
  if (validationFailure !== null) return invalidSource(validationFailure);

  const result = await writeData({
    outDir: cfg.dataOutDir,
    kpis,
    buildSha: cfg.buildSha,
    pipelineVersion: cfg.pipelineVersion,
    now: cfg.now,
  });

  return {
    status: "completed",
    message: decision.mode === "bootstrap" ? "OK (bootstrap)" : "OK",
    kpisFile: result.kpisFile,
    rowsExtracted,
    filesUploaded: upload.uploaded.length,
    filesDeleted: upload.deleted.length,
  };
};
