/**
 * Pipeline entry point — invoked by `.github/workflows/daily.yml` (§17).
 *
 * Wires real BQ + GitHub Release + DuckDB clients into the orchestrator,
 * then prints the result and exits with the appropriate status code.
 */
import { join } from "node:path";
import { createRealBqClient } from "./bq/real-client.ts";
import { createRealDuckdbRunner } from "./duckdb/real-runner.ts";
import { runOrchestrator } from "./orchestrator/run.ts";
import { createRealReleaseManager, releaseEnvCoords } from "./release/real-manager.ts";

const PIPELINE_VERSION = "1.0.0";
const MAX_BYTES_BILLED = 50 * 2 ** 30; // 50 GB cap (§8.3)

const repoRoot = process.env.GITHUB_WORKSPACE ?? join(import.meta.dir, "..", "..");
const buildSha = process.env.GITHUB_SHA ?? "local";

const result = await runOrchestrator(
  {
    bq: createRealBqClient(),
    release: createRealReleaseManager(releaseEnvCoords()),
    duckdb: createRealDuckdbRunner(),
  },
  {
    maxBytesBilled: MAX_BYTES_BILLED,
    tmpDir: join(repoRoot, "pipeline", "tmp"),
    dataOutDir: join(repoRoot, "web", "public", "data"),
    buildSha,
    pipelineVersion: PIPELINE_VERSION,
    now: new Date(),
  },
);

console.info(JSON.stringify(result, null, 2));

if (
  result.status === "stale-source" ||
  result.status === "invalid-source" ||
  result.status === "no-rows"
) {
  process.exit(0);
}
