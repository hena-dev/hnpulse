import { completeUtcDayThrough, fetchMaxTimestamp } from "../bq/freshness.ts";
import { formatUtcDay, startOfUtcDay } from "../dates/utc-day.ts";
import { writeData } from "../emit/write-data.ts";
import { ARCHIVE_START } from "../release/archive.ts";
import { parseParquetAssetDate, pickParquetAssets } from "../release/policy.ts";
import { buildSnapshots } from "../snapshots/build.ts";
import { daysBetween, offsetDay } from "../snapshots/dates.ts";
import { publishSnapshots } from "../snapshots/publish.ts";
import { planSnapshots } from "../snapshots/store.ts";
import { runAggregateRows } from "./aggregate-step.ts";
import { buildSourcePlan } from "./source-plan.ts";
import { extractSourceRanges, sourcePlanFailure } from "./source-step.ts";
import type { OrchestratorConfig, OrchestratorDeps, OrchestratorResult } from "./types.ts";
import { runUploadNdjsonStep } from "./upload-step.ts";
import { validatePublication } from "./validate-step.ts";

const skipped = (
  status: "invalid-source" | "incomplete-source",
  message: string,
): OrchestratorResult => ({ status, message: `Skipped publish: ${message}` });

export const runOrchestrator = async (
  deps: OrchestratorDeps,
  cfg: OrchestratorConfig,
): Promise<OrchestratorResult> => {
  const windowDays = cfg.windowDays ?? 730;
  const stabilizationDays = cfg.stabilizationDays ?? 7;
  const last = offsetDay(formatUtcDay(startOfUtcDay(cfg.now)), -1);
  const archiveFirst = cfg.archiveFirst ?? ARCHIVE_START;
  const snapshots = await planSnapshots({
    dataDir: cfg.existingDataDir ?? cfg.dataOutDir,
    first: cfg.snapshotFirst ?? "2025-01-01",
    last,
    windowDays,
    stabilizationDays,
  });
  const maxTs = await fetchMaxTimestamp(deps.bq, { maxBytesBilled: cfg.maxBytesBilled });
  const initialAssets = await deps.release.listAssets();
  const existingDays = pickParquetAssets(initialAssets).map(
    (asset) => parseParquetAssetDate(asset.name) as string,
  );
  const plan = buildSourcePlan({
    windowStart: archiveFirst,
    windowEnd: last,
    existingDays,
    bqCompleteThrough: completeUtcDayThrough(maxTs),
    stabilizationDays,
    refreshFrom: snapshots.refreshFrom,
  });
  const planFailure = sourcePlanFailure(plan, deps);
  if (planFailure !== null) return skipped("incomplete-source", planFailure);
  const source = await extractSourceRanges(deps, cfg, plan.ranges);
  if (source.rowsExtracted === 0 && plan.ranges.length > 0) {
    return {
      status: "no-rows",
      message: "No rows available for planned source ranges",
      rowsExtracted: 0,
    };
  }
  if (source.missing.length > 0) {
    return skipped(
      "incomplete-source",
      `Source refresh missing day(s): ${source.missing.join(", ")}`,
    );
  }
  const coverage = new Set([...existingDays, ...source.files.map((file) => file.day)]);
  const missing = daysBetween(snapshots.aggregateStart, last).filter((day) => !coverage.has(day));
  if (missing.length > 0)
    return skipped("incomplete-source", `Missing aggregation day(s): ${missing.join(", ")}`);
  const upload = await runUploadNdjsonStep({
    ndjsons: source.files,
    tmpDir: cfg.tmpDir,
    release: deps.release,
    duckdb: deps.duckdb,
    now: cfg.now,
    retentionDays: cfg.retentionDays ?? 730,
    existingAssets: initialAssets,
    uploadCap: cfg.uploadCap ?? 400,
    dryRun: cfg.dryRun ?? false,
    refreshFrom: snapshots.refreshFrom,
  });
  const rows = await runAggregateRows({
    release: deps.release,
    duckdb: deps.duckdb,
    tmpDir: cfg.tmpDir,
    windowStart: snapshots.aggregateStart,
    windowEnd: last,
    assets: initialAssets,
    localFiles: upload.localFiles,
  });
  const built = buildSnapshots({ plan: snapshots, windowDays, now: cfg.now, ...rows });
  const failure = validatePublication(built.latest, built.days, built.metrics, cfg.now);
  if (failure !== null) return skipped("invalid-source", failure);
  await publishSnapshots({
    outDir: cfg.dataOutDir,
    plan: snapshots,
    snapshots: built.snapshots(),
    windowDays,
  });
  const result = await writeData({
    outDir: cfg.dataOutDir,
    kpis: built.latest,
    buildSha: cfg.buildSha,
    pipelineVersion: cfg.pipelineVersion,
    now: cfg.now,
    dataSources: [...new Set(plan.ranges.map((range) => range.source))],
    stabilizationDays,
    provisionalFrom: plan.provisionalFrom,
    snapshots: { first: snapshots.first, finalThrough: snapshots.finalThrough, last },
  });
  return {
    status: "completed",
    message: "OK",
    kpisFile: result.kpisFile,
    rowsExtracted: source.rowsExtracted,
    filesUploaded: upload.uploaded.length,
    filesDeleted: upload.deleted.length,
  };
};
