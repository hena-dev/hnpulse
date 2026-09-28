import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { buildNdjsonToParquetSql } from "../duckdb/sql-templates.ts";
import type { DuckdbRunner } from "../duckdb/types.ts";
import { SnapshotJsonSchema } from "../schema/snapshot.ts";
import { snapshotConfig, snapshotDeps } from "./_snapshot-fixtures.ts";
import { bqRow } from "./_test-fixtures.ts";
import { runOrchestrator } from "./run.ts";

const exec = promisify(execFile);
const available = await exec("duckdb", ["--version"]).then(
  () => true,
  () => false,
);
const duckdb: DuckdbRunner = {
  execute: async (sql) => (await exec("duckdb", ["-c", sql])).stdout,
  queryJson: async <T>(sql: string): Promise<readonly T[]> =>
    JSON.parse((await exec("duckdb", ["-json", "-c", sql])).stdout),
};

describe.skipIf(!available)("snapshot orchestration with real DuckDB", () => {
  it("aggregates cap-zero dry-run local inputs and excludes stale parquet files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "snapshot-duckdb-"));
    try {
      const cfg = { ...snapshotConfig(dir), uploadCap: 0, dryRun: true };
      const localDir = join(cfg.tmpDir, "parquet-local");
      await mkdir(localDir, { recursive: true });
      const staleNdjson = join(dir, "stale.ndjson");
      await writeFile(
        staleNdjson,
        JSON.stringify(bqRow(999, "2026-04-27T00:00:00Z", "story", { score: 999 })),
      );
      await duckdb.execute(
        buildNdjsonToParquetSql({
          ndjsonPath: staleNdjson,
          parquetPath: join(localDir, "items-2026-04-24.parquet"),
        }),
      );
      const deps = { ...snapshotDeps(), duckdb };
      const result = await runOrchestrator(deps, cfg);
      expect(result.status).toBe("completed");
      expect(result.filesUploaded).toBe(0);
      expect(deps.release.uploads).toEqual([]);
      expect(deps.release.deletes).toEqual([]);
      expect(await readdir(join(cfg.tmpDir, "parquet"))).toHaveLength(9);
      const readSnapshot = async (path: string) =>
        SnapshotJsonSchema.parse(JSON.parse(await readFile(join(cfg.dataOutDir, path), "utf8")));
      const final = await readSnapshot("snapshots/2026-04-27.json");
      expect(final.status).toBe("final");
      expect(final.metrics.stories).toEqual([1, 1, 1]);
      expect(final.metrics.medianScore).toEqual([50, 50, 50]);
      expect(final.topDomainsByRange["2y"]).toEqual([{ name: "github.com", stories: 3, share: 1 }]);
      const provisional = await readSnapshot("provisional/2026-05-03.json");
      expect(provisional.status).toBe("provisional");
      expect(provisional.metrics.stories).toEqual([1, 1, 1, 1, 1, 1]);
      expect(await readdir(join(cfg.dataOutDir, "snapshots"))).toHaveLength(5);
      expect(await readdir(join(cfg.dataOutDir, "provisional"))).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
