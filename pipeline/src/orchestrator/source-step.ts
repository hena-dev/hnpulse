import { join } from "node:path";
import { extractRowsStream } from "../bq/extract.ts";
import { parseUtcDay } from "../dates/utc-day.ts";
import { fetchHnApiRows } from "../hn-api/fetch.ts";
import { writeNdjsonByDayFromRows } from "../parquet/write-by-day.ts";
import { daysBetween, offsetDay } from "../snapshots/dates.ts";
import type { SourcePlan, SourceRange } from "./source-plan.ts";
import type { OrchestratorConfig, OrchestratorDeps } from "./types.ts";

export const extractSourceRanges = async (
  deps: OrchestratorDeps,
  cfg: OrchestratorConfig,
  ranges: readonly SourceRange[],
) => {
  const files = [];
  // Sequential ranges avoid overlapping writers and unbounded source pressure in catch-up runs.
  for (const range of ranges) {
    const since = parseUtcDay(range.start);
    const until = parseUtcDay(offsetDay(range.end, 1));
    const rows =
      range.source === "bigquery"
        ? extractRowsStream(deps.bq, { since, until, maxBytesBilled: cfg.maxBytesBilled })
        : fetchHnApiRows({ client: requireHnApi(deps), since, until });
    files.push(...(await writeNdjsonByDayFromRows(rows, join(cfg.tmpDir, "ndjson"))));
  }
  const present = new Set(files.filter((file) => file.rows > 0).map((file) => file.day));
  const missing = ranges
    .flatMap((range) => daysBetween(range.start, range.end))
    .filter((day) => !present.has(day));
  return { files, missing, rowsExtracted: files.reduce((sum, file) => sum + file.rows, 0) };
};

const requireHnApi = (deps: OrchestratorDeps) => {
  if (deps.hnApi === undefined) throw new Error("HN API client is required for live fill");
  return deps.hnApi;
};

export const sourcePlanFailure = (plan: SourcePlan, deps: OrchestratorDeps): string | null => {
  if (plan.missingImmutableDays.length > 0) {
    return `Missing immutable parquet day(s) not fillable from BQ: ${plan.missingImmutableDays.join(", ")}`;
  }
  if (plan.ranges.some((range) => range.source === "hacker-news-api") && deps.hnApi === undefined) {
    return "HN API client is required to fill BQ-lagging closed days";
  }
  return null;
};
