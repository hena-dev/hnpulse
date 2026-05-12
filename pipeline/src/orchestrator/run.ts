import { join } from "node:path";
import { extractRowsStream } from "../bq/extract.ts";
import { completeUtcDayThrough, fetchMaxTimestamp } from "../bq/freshness.ts";
import { formatUtcDay, parseUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import { writeData } from "../emit/write-data.ts";
import { fetchHnApiRows } from "../hn-api/fetch.ts";
import { writeNdjsonByDayFromRows } from "../parquet/write-by-day.ts";
import { parseParquetAssetDate, pickParquetAssets } from "../release/policy.ts";
import type { ReleaseAsset } from "../release/types.ts";
import type { KpisJson } from "../schema/kpis.ts";
import type { DataSource } from "../schema/meta.ts";
import { findEmptyDays } from "../validate/coverage.ts";
import { findOutliers } from "../validate/outliers.ts";
import { runAggregateStep } from "./aggregate-step.ts";
import { buildSourcePlan, type SourceKind, type SourceRange } from "./source-plan.ts";
import type { OrchestratorConfig, OrchestratorDeps, OrchestratorResult } from "./types.ts";
import { runUploadNdjsonStep } from "./upload-step.ts";

const MS_PER_DAY = 86_400_000;
const DEFAULT_RETENTION_DAYS = 730;
const DEFAULT_WINDOW_DAYS = 730;
const DEFAULT_STABILIZATION_DAYS = 7;

const computeWindow = (now: Date, windowDays: number): { start: string; end: string } => {
  const startOfToday = startOfUtcDay(now);
  const end = new Date(startOfToday.getTime() - MS_PER_DAY);
  const start = new Date(end.getTime() - (windowDays - 1) * MS_PER_DAY);
  return { start: formatUtcDay(start), end: formatUtcDay(end) };
};

const dayAfter = (day: string): Date => new Date(parseUtcDay(day).getTime() + MS_PER_DAY);

const sumNdjsonRows = (files: readonly { rows: number }[]): number =>
  files.reduce((sum, file) => sum + file.rows, 0);

const buildSeriesForOutliers = (
  metrics: Readonly<Record<string, readonly number[]>>,
): Readonly<Record<string, readonly number[]>> => metrics;

const validateKpis = (kpis: KpisJson, now: Date): string | null => {
  const expectedEnd = formatUtcDay(new Date(startOfUtcDay(now).getTime() - MS_PER_DAY));
  if (kpis.windowEnd !== expectedEnd) {
    return `Validation failed (freshness): windowEnd=${kpis.windowEnd}, expected ${expectedEnd}`;
  }
  const today = formatUtcDay(startOfUtcDay(now));
  if (kpis.days.some((day) => day >= today)) {
    return `Validation failed (date coverage): data includes today/future day (today=${today})`;
  }

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

const incompleteSource = (message: string): OrchestratorResult => ({
  status: "incomplete-source",
  message: `Skipped publish: ${message}`,
});

const existingParquetDays = (assets: readonly ReleaseAsset[]): readonly string[] =>
  pickParquetAssets(assets)
    .map((a) => parseParquetAssetDate(a.name) as string)
    .sort();

const sourceToMeta = (source: SourceKind): DataSource => source;

const appendNdjsonsForRange = async (
  deps: OrchestratorDeps,
  cfg: OrchestratorConfig,
  range: SourceRange,
): Promise<readonly { day: string; path: string; rows: number }[]> => {
  const since = parseUtcDay(range.start);
  const until = dayAfter(range.end);
  const outDir = join(cfg.tmpDir, "ndjson");
  if (range.source === "bigquery") {
    return writeNdjsonByDayFromRows(
      extractRowsStream(deps.bq, { since, until, maxBytesBilled: cfg.maxBytesBilled }),
      outDir,
    );
  }
  if (deps.hnApi === undefined) throw new Error("HN API client is required for live fill");
  return writeNdjsonByDayFromRows(fetchHnApiRows({ client: deps.hnApi, since, until }), outDir);
};

export const runOrchestrator = async (
  deps: OrchestratorDeps,
  cfg: OrchestratorConfig,
): Promise<OrchestratorResult> => {
  const maxTs = await fetchMaxTimestamp(deps.bq, { maxBytesBilled: cfg.maxBytesBilled });
  const bqCompleteThrough = completeUtcDayThrough(maxTs);
  const initialAssets = await deps.release.listAssets();
  const window = computeWindow(cfg.now, cfg.windowDays ?? DEFAULT_WINDOW_DAYS);
  const retentionDays = cfg.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const stabilizationDays = cfg.stabilizationDays ?? DEFAULT_STABILIZATION_DAYS;
  const plan = buildSourcePlan({
    windowStart: window.start,
    windowEnd: window.end,
    existingDays: existingParquetDays(initialAssets),
    bqCompleteThrough,
    stabilizationDays,
  });

  if (plan.missingImmutableDays.length > 0) {
    return incompleteSource(
      `Missing immutable parquet day(s) not fillable from BQ: ${plan.missingImmutableDays.join(", ")}`,
    );
  }
  if (plan.ranges.some((range) => range.source === "hacker-news-api") && deps.hnApi === undefined) {
    return incompleteSource("HN API client is required to fill BQ-lagging closed days");
  }

  const ndjsons = (
    await Promise.all(plan.ranges.map((range) => appendNdjsonsForRange(deps, cfg, range)))
  ).flat();
  const rowsExtracted = sumNdjsonRows(ndjsons);

  if (rowsExtracted === 0) {
    return {
      status: "no-rows",
      message: "No rows available for planned source ranges",
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

  const validationFailure = validateKpis(kpis, cfg.now);
  if (validationFailure !== null) return invalidSource(validationFailure);

  const result = await writeData({
    outDir: cfg.dataOutDir,
    kpis,
    buildSha: cfg.buildSha,
    pipelineVersion: cfg.pipelineVersion,
    now: cfg.now,
    dataSources: [...new Set(plan.ranges.map((range) => sourceToMeta(range.source)))],
    stabilizationDays,
    provisionalFrom: plan.provisionalFrom,
  });

  return {
    status: "completed",
    message: "OK",
    kpisFile: result.kpisFile,
    rowsExtracted,
    filesUploaded: upload.uploaded.length,
    filesDeleted: upload.deleted.length,
  };
};
