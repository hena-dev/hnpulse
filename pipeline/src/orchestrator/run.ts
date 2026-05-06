import { aggregateKpisFromBq } from "../bq/aggregate.ts";
import { computeSinceTimestamp, extractRows } from "../bq/extract.ts";
import { fetchMaxTimestamp, isFreshAsOf } from "../bq/freshness.ts";
import { formatUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import { writeData } from "../emit/write-data.ts";
import type { KpisJson } from "../schema/kpis.ts";
import { findEmptyDays } from "../validate/coverage.ts";
import { findOutliers } from "../validate/outliers.ts";
import { runAggregateStep } from "./aggregate-step.ts";
import { decideMode } from "./decide-mode.ts";
import type { OrchestratorConfig, OrchestratorDeps, OrchestratorResult } from "./types.ts";
import { runUploadStep } from "./upload-step.ts";

const MS_PER_DAY = 86_400_000;
const DEFAULT_RETENTION_DAYS = 730;
const DEFAULT_WINDOW_DAYS = 730;

const computeWindow = (now: Date, windowDays: number): { start: string; end: string } => {
  const startOfToday = startOfUtcDay(now);
  const end = new Date(startOfToday.getTime() - MS_PER_DAY);
  const start = new Date(end.getTime() - (windowDays - 1) * MS_PER_DAY);
  return { start: formatUtcDay(start), end: formatUtcDay(end) };
};

const buildSeriesForOutliers = (
  metrics: Readonly<Record<string, readonly number[]>>,
): Readonly<Record<string, readonly number[]>> => metrics;

const validateKpis = (kpis: KpisJson): void => {
  const outliers = findOutliers(buildSeriesForOutliers(kpis.metrics));
  if (outliers.length > 0) {
    throw new Error(
      `Validation failed (10× rule): ${outliers.map((o) => `${o.metric}=${o.value} (median=${o.median}, ratio=${o.ratio})`).join("; ")}`,
    );
  }

  const emptyDays = findEmptyDays(kpis.days, kpis.metrics.stories);
  if (emptyDays.length > 0) {
    throw new Error(
      `Validation failed (date coverage): ${emptyDays.length} day(s) with 0 stories (first: ${emptyDays[0]})`,
    );
  }
};

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

  if (decision.mode === "bootstrap") {
    const kpis = await aggregateKpisFromBq(deps.bq, {
      windowStart: window.start,
      windowEnd: window.end,
      maxBytesBilled: cfg.maxBytesBilled,
    });
    validateKpis(kpis);
    const result = await writeData({
      outDir: cfg.dataOutDir,
      kpis,
      buildSha: cfg.buildSha,
      pipelineVersion: cfg.pipelineVersion,
      now: cfg.now,
    });
    return {
      status: "completed",
      message: "OK (direct BQ bootstrap)",
      kpisFile: result.kpisFile,
      rowsExtracted: kpis.days.length,
      filesUploaded: 0,
      filesDeleted: 0,
    };
  }

  const since = computeSinceTimestamp({
    mode: decision.mode,
    now: cfg.now,
    lastMaxTs: decision.lastMaxTs,
  });
  const rows = await extractRows(deps.bq, { since, maxBytesBilled: cfg.maxBytesBilled });

  if (rows.length === 0 && decision.mode === "incremental") {
    return { status: "no-rows", message: "No new rows since last run", rowsExtracted: 0 };
  }

  const retentionDays = cfg.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const upload = await runUploadStep({
    rows,
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

  validateKpis(kpis);

  const result = await writeData({
    outDir: cfg.dataOutDir,
    kpis,
    buildSha: cfg.buildSha,
    pipelineVersion: cfg.pipelineVersion,
    now: cfg.now,
  });

  return {
    status: "completed",
    message: "OK",
    kpisFile: result.kpisFile,
    rowsExtracted: rows.length,
    filesUploaded: upload.uploaded.length,
    filesDeleted: upload.deleted.length,
  };
};
